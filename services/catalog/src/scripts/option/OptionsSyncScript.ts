import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type {
  OptionSyncParams,
  OptionSyncResult,
  OptionValueSyncInput,
  OptionSwatchInput,
} from "./dto/index.js";
import {
  OptionSyncInputSchema,
  type ValidatedOptionInput,
  validateSemantic,
  loadDbContext,
  validateDatabase,
} from "./validation/index.js";

interface ResolvedOption {
  readonly input: ValidatedOptionInput;
  readonly id: string;
}

export class OptionsSyncScript extends BaseScript<OptionSyncParams, OptionSyncResult> {
  @Transactional()
  protected async execute(params: OptionSyncParams): Promise<OptionSyncResult> {
    // ═══════════════════════════════════════════════════════════════════════
    // Layer 1: Structural validation (Zod)
    // ═══════════════════════════════════════════════════════════════════════
    const parseResult = OptionSyncInputSchema.safeParse(params);
    if (!parseResult.success) {
      return {
        product: undefined,
        options: [],
        userErrors: parseResult.error.issues.map((issue) => ({
          message: issue.message,
          field: issue.path.map(String),
          code: "VALIDATION_ERROR",
        })),
      };
    }
    const { productId, options } = parseResult.data;

    // ═══════════════════════════════════════════════════════════════════════
    // Product existence check
    // ═══════════════════════════════════════════════════════════════════════
    if (!(await this.repository.product.exists(productId))) {
      return this.error("Product not found", ["productId"], "NOT_FOUND");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Layer 2: Semantic validation (sync, no DB)
    // ═══════════════════════════════════════════════════════════════════════
    const semanticErrors = validateSemantic(options);
    if (semanticErrors.length > 0) {
      return { product: undefined, options: [], userErrors: semanticErrors };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Layer 3: Database validation (async, batch queries)
    // ═══════════════════════════════════════════════════════════════════════
    const dbCtx = await loadDbContext(this.repository.option, productId, options);
    const dbErrors = validateDatabase(options, dbCtx);
    if (dbErrors.length > 0) {
      return { product: undefined, options: [], userErrors: dbErrors };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Sync: Delete -> Create -> Update
    // ═══════════════════════════════════════════════════════════════════════
    const keepIds = options.flatMap((o) => (o.id ? [o.id] : []));
    await this.repository.option.deleteExcept(productId, keepIds);

    const resolved = await this.resolveOptions(productId, options);

    for (const item of resolved) {
      await this.upsertOption(item);
      await this.syncValues(item.id, item.input.values);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Return result
    // ═══════════════════════════════════════════════════════════════════════
    const [product, syncedOptions] = await Promise.all([
      this.repository.product.findById(productId),
      this.repository.option.findByProductId(productId),
    ]);

    this.logger.info(
      { productId, optionCount: syncedOptions.length },
      "Product options synced"
    );

    return { product: product ?? undefined, options: syncedOptions, userErrors: [] };
  }

  /**
   * Resolves options: creates new records, returns resolved list with IDs.
   */
  private async resolveOptions(
    productId: string,
    options: ValidatedOptionInput[]
  ): Promise<ResolvedOption[]> {
    const resolved: ResolvedOption[] = [];

    for (const opt of options) {
      let id: string;

      if (opt.id) {
        id = opt.id;
      } else {
        const created = await this.repository.option.create(productId, {
          slug: opt.slug,
          displayType: opt.displayType,
          sortIndex: opt.sortIndex,
        });
        id = created.id;
      }

      resolved.push({ input: opt, id });
    }

    return resolved;
  }

  private async upsertOption(item: ResolvedOption): Promise<void> {
    await this.repository.option.update(item.id, {
      slug: item.input.slug,
      displayType: item.input.displayType,
      sortIndex: item.input.sortIndex,
    });

    await this.repository.translation.upsertOptionTranslation({
      projectId: this.getProjectId(),
      optionId: item.id,
      locale: this.getLocale(),
      name: item.input.name,
    });
  }

  private async syncValues(optionId: string, values: ValidatedOptionInput["values"]): Promise<void> {
    const keepIds = values.flatMap((v) => (v.id ? [v.id] : []));
    await this.repository.option.deleteValuesExcept(optionId, keepIds);

    const sorted = [...values].sort((a, b) => a.sortIndex - b.sortIndex);

    for (const value of sorted) {
      let valueId: string;
      let swatchId: string | null = null;

      // Handle swatch creation
      if (value.swatch) {
        swatchId = await this.createSwatch(value.swatch);
      }

      if (value.id) {
        await this.repository.option.updateValue(value.id, {
          slug: value.slug,
          sortIndex: value.sortIndex,
          swatchId: value.swatch === null ? null : swatchId,
        });
        valueId = value.id;
      } else {
        const created = await this.repository.option.createValue(optionId, {
          slug: value.slug,
          sortIndex: value.sortIndex,
          swatchId,
        });
        valueId = created.id;
      }

      await this.repository.translation.upsertOptionValueTranslation({
        projectId: this.getProjectId(),
        optionValueId: valueId,
        locale: this.getLocale(),
        name: value.name,
      });
    }
  }

  private async createSwatch(swatch: NonNullable<OptionSwatchInput>): Promise<string> {
    const created = await this.repository.option.createSwatch({
      swatchType: swatch.swatchType,
      colorOne: swatch.colorOne ?? null,
      colorTwo: swatch.colorTwo ?? null,
      imageId: swatch.fileId ?? null,
      metadata: swatch.metadata ?? null,
    });
    return created.id;
  }

  private error(message: string, field: string[], code: string): OptionSyncResult {
    return { product: undefined, options: [], userErrors: [{ message, field, code }] };
  }

  protected handleError(_error: unknown): OptionSyncResult {
    return this.error("Internal error", [], "INTERNAL_ERROR");
  }
}
