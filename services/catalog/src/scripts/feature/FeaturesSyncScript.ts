import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { FeatureSyncParams, FeatureSyncResult } from "./dto/index.js";
import {
  FeatureSyncInputSchema,
  type ValidatedFeatureInput,
  type ValidatedValueInput,
  validateSemantic,
  loadDbContext,
  validateDatabase,
  indexToKey,
  getParentIndex,
} from "./validation/index.js";

interface ResolvedFeature {
  readonly index: number[];
  readonly input: ValidatedFeatureInput;
  readonly id: string;
  readonly parentId: string | null;
}

export class FeaturesSyncScript extends BaseScript<FeatureSyncParams, FeatureSyncResult> {
  @Transactional()
  protected async execute(params: FeatureSyncParams): Promise<FeatureSyncResult> {
    // ═══════════════════════════════════════════════════════════════════════
    // Layer 1: Structural validation (Zod)
    // ═══════════════════════════════════════════════════════════════════════
    const parseResult = FeatureSyncInputSchema.safeParse(params);
    if (!parseResult.success) {
      return {
        product: undefined,
        features: [],
        userErrors: parseResult.error.issues.map((issue) => ({
          message: issue.message,
          field: issue.path.map(String),
          code: "VALIDATION_ERROR",
        })),
      };
    }
    const { productId, features } = parseResult.data;

    // ═══════════════════════════════════════════════════════════════════════
    // Product existence check
    // ═══════════════════════════════════════════════════════════════════════
    if (!(await this.repository.product.exists(productId))) {
      return this.error("Product not found", ["productId"], "NOT_FOUND");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Layer 2: Semantic validation (sync, no DB)
    // ═══════════════════════════════════════════════════════════════════════
    const semanticErrors = validateSemantic(features);
    if (semanticErrors.length > 0) {
      return { product: undefined, features: [], userErrors: semanticErrors };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Layer 3: Database validation (async, batch queries)
    // ═══════════════════════════════════════════════════════════════════════
    const dbCtx = await loadDbContext(this.repository.feature, productId, features);
    const dbErrors = validateDatabase(features, dbCtx);
    if (dbErrors.length > 0) {
      return { product: undefined, features: [], userErrors: dbErrors };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Sync: Delete -> Create -> Update
    // ═══════════════════════════════════════════════════════════════════════
    const keepIds = features.flatMap((f) => (f.id ? [f.id] : []));
    await this.repository.feature.deleteExcept(productId, keepIds);

    const resolved = await this.resolveFeatures(productId, features);

    for (const item of resolved) {
      await this.upsertFeature(item);
    }

    for (const item of resolved) {
      if (!item.input.isGroup) {
        await this.syncValues(item.id, item.input.values ?? []);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Return result
    // ═══════════════════════════════════════════════════════════════════════
    const [product, syncedFeatures] = await Promise.all([
      this.repository.product.findById(productId),
      this.repository.feature.findByProductId(productId),
    ]);

    this.logger.info(
      {
        productId,
        featureCount: syncedFeatures.length,
      },
      "Product features synced"
    );

    return { product: product ?? undefined, features: syncedFeatures, userErrors: [] };
  }

  /**
   * Resolves features: creates new records, resolves parentId from index.
   */
  private async resolveFeatures(
    productId: string,
    features: ValidatedFeatureInput[]
  ): Promise<ResolvedFeature[]> {
    const indexKeyToDbId = new Map<string, string>();

    // Map existing
    for (const f of features) {
      if (f.id) {
        indexKeyToDbId.set(indexToKey(f.index), f.id);
      }
    }

    // Create new groups (root, no dependencies)
    for (const f of features) {
      if (f.isGroup && !f.id) {
        const created = await this.repository.feature.create(productId, {
          isGroup: true,
          parentId: null,
          index: f.index,
        });
        indexKeyToDbId.set(indexToKey(f.index), created.id);
      }
    }

    // Create new attributes
    for (const f of features) {
      if (!f.isGroup && !f.id) {
        const created = await this.repository.feature.create(productId, {
          isGroup: false,
          index: f.index,
          parentId: null,
        });
        indexKeyToDbId.set(indexToKey(f.index), created.id);
      }
    }

    // Build resolved with parentId
    return features.map((f) => {
      const parentIndex = getParentIndex(f.index);
      const parentId = parentIndex ? (indexKeyToDbId.get(indexToKey(parentIndex)) ?? null) : null;

      return {
        index: f.index,
        input: f,
        id: indexKeyToDbId.get(indexToKey(f.index))!,
        parentId,
      };
    });
  }

  private async upsertFeature(item: ResolvedFeature): Promise<void> {
    await this.repository.feature.update(item.id, {
      isGroup: item.input.isGroup,
      parentId: item.parentId,
      index: item.index,
    });

    await this.repository.translation.upsertFeatureTranslation({
      projectId: this.getProjectId(),
      featureId: item.id,
      locale: this.getLocale(),
      name: item.input.name,
    });
  }

  private async syncValues(featureId: string, values: ValidatedValueInput[]): Promise<void> {
    const keepIds = values.flatMap((v) => (v.id ? [v.id] : []));
    await this.repository.feature.deleteValuesExcept(featureId, keepIds);

    const sorted = [...values].sort((a, b) => a.index - b.index);

    for (const value of sorted) {
      let valueId: string;

      if (value.id) {
        await this.repository.feature.updateValue(featureId, value.id, { index: value.index });
        valueId = value.id;
      } else {
        const created = await this.repository.feature.createValue(featureId, { index: value.index });
        valueId = created.id;
      }

      await this.repository.translation.upsertFeatureValueTranslation({
        projectId: this.getProjectId(),
        featureValueId: valueId,
        locale: this.getLocale(),
        name: value.name,
      });
    }
  }

  private error(message: string, field: string[], code: string): FeatureSyncResult {
    return { product: undefined, features: [], userErrors: [{ message, field, code }] };
  }

  protected handleError(_error: unknown): FeatureSyncResult {
    return this.error("Internal error", [], "INTERNAL_ERROR");
  }
}
