import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import type { OptionUpdateParams, OptionUpdateResult, OptionValuesInput, OptionSwatchInput } from "./dto/index.js";
import { buildVariantHandlesBatch } from "../variant/helpers/buildVariantHandle.js";
import { eq, and, inArray } from "drizzle-orm";
import { productOptionVariantLink, variant } from "../../repositories/models/index.js";
import type { FacetReferenceChange } from "@shopana/events";
import type {
  ProductOption,
  ProductOptionValue,
} from "../../repositories/models/index.js";
import {
  buildOptionSourceChange,
  buildOptionValueChange,
  uniqueFacetReferenceChanges,
} from "../shared/facetReferenceRefs.js";

export class OptionUpdateScript extends BaseScript<OptionUpdateParams, OptionUpdateResult> {
  protected async execute(params: OptionUpdateParams): Promise<OptionUpdateResult> {
    const { id, slug, name, displayType, sortIndex, values } = params;

    // 1. Check option exists
    const existingOption = await this.repository.option.findById(id);
    if (!existingOption) {
      return {
        option: undefined,
        userErrors: [{ message: "Option not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }
    const existingValues = await this.repository.option.findValuesByOptionId(id);

    // 2. Check slug uniqueness if changing
    if (slug !== undefined && slug !== existingOption.slug) {
      const optionWithSlug = await this.repository.option.findBySlug(
        existingOption.productId,
        slug
      );
      if (optionWithSlug) {
        return {
          option: undefined,
          userErrors: [{
            message: `Option with slug "${slug}" already exists`,
            field: ["slug"],
            code: "SLUG_ALREADY_EXISTS",
          }],
        };
      }
    }

    // 3. Update option
    const updateData: { slug?: string; displayType?: string; sortIndex?: number } = {};
    if (slug !== undefined) updateData.slug = slug;
    if (displayType !== undefined) updateData.displayType = displayType;
    if (sortIndex !== undefined) updateData.sortIndex = sortIndex;

    if (Object.keys(updateData).length > 0) {
      await this.repository.option.update(id, updateData);
    }

    // 4. Update translation if name provided
    if (name !== undefined) {
      await this.repository.translation.upsertOptionTranslation({
        projectId: this.getProjectId(),
        optionId: id,
        locale: this.getLocale(),
        name,
      });
    }

    // 5. Handle values updates
    let valueFacetReferenceRefs: FacetReferenceChange[] = [];
    if (values) {
      const valueResult = await this.processValuesUpdate(
        existingOption,
        slug ?? existingOption.slug,
        existingValues,
        values
      );
      const { errors, facetReferenceRefs } = valueResult;
      if (errors.length > 0) {
        return { option: undefined, userErrors: errors };
      }
      valueFacetReferenceRefs = facetReferenceRefs;
    }

    // 6. Fetch updated option
    const option = await this.repository.option.findById(id);

    this.logger.info({ optionId: id }, "Option updated");

    const deletedValueIds = new Set(values?.delete ?? []);

    return {
      option: option ?? undefined,
      facetReferenceRefs: uniqueFacetReferenceChanges([
        ...(slug !== undefined && slug !== existingOption.slug
          ? [
              buildOptionSourceChange({
                before: existingOption,
                after: { slug },
                reason: "sourceUpdated",
              }),
              ...existingValues.flatMap((value) =>
                deletedValueIds.has(value.id)
                  ? []
                  : [
                      buildOptionValueChange({
                        before: { option: existingOption, value },
                        after: {
                          option: { slug },
                          value: { slug: nextValueSlug(value, values) },
                        },
                        reason: "sourceValueUpdated",
                      }),
                    ]
              ),
            ]
          : []),
        ...valueFacetReferenceRefs,
      ]),
      userErrors: [],
    };
  }

  private async processValuesUpdate(
    option: ProductOption,
    nextOptionSlug: string,
    existingValues: ProductOptionValue[],
    values: OptionValuesInput
  ): Promise<{
    errors: UserError[];
    facetReferenceRefs: FacetReferenceChange[];
  }> {
    // Track value IDs that had slug changes - we'll rebuild variant handles for these
    const changedValueIds: string[] = [];
    const facetReferenceRefs: FacetReferenceChange[] = [];
    const existingById = new Map(existingValues.map((value) => [value.id, value]));

    // Delete values
    if (values.delete?.length) {
      for (const valueId of values.delete) {
        const existingValue = existingById.get(valueId);
        if (!existingValue) {
          return {
            errors: [{ message: "Option value not found", field: ["values", "delete"], code: "NOT_FOUND" }],
            facetReferenceRefs: [],
          };
        }
        facetReferenceRefs.push(
          buildOptionValueChange({
            before: { option, value: existingValue },
            reason: "sourceValueDeleted",
          })
        );
        await this.repository.option.deleteValue(valueId);
      }
    }

    // Update existing values
    if (values.update?.length) {
      for (const valueUpdate of values.update) {
        const existingValue = existingById.get(valueUpdate.id);
        if (!existingValue) {
          return {
            errors: [{ message: "Option value not found", field: ["values", "update"], code: "NOT_FOUND" }],
            facetReferenceRefs: [],
          };
        }

        const updateData: {
          slug?: string;
          sortIndex?: number;
          swatchId?: string | null;
        } = {};

        if (valueUpdate.slug !== undefined && valueUpdate.slug !== existingValue.slug) {
          updateData.slug = valueUpdate.slug;
          // Track that this value's slug changed
          changedValueIds.push(valueUpdate.id);
          facetReferenceRefs.push(
            buildOptionValueChange({
              before: { option, value: existingValue },
              after: {
                option: { slug: nextOptionSlug },
                value: { slug: valueUpdate.slug },
              },
              reason: "sourceValueUpdated",
            })
          );
        }
        if (valueUpdate.sortIndex !== undefined) {
          updateData.sortIndex = valueUpdate.sortIndex;
        }

        if (valueUpdate.swatch !== undefined) {
          if (valueUpdate.swatch === null) {
            updateData.swatchId = null;
          } else {
            const swatchId = await this.createSwatch(valueUpdate.swatch);
            updateData.swatchId = swatchId;
          }
        }

        if (Object.keys(updateData).length > 0) {
          await this.repository.option.updateValue(valueUpdate.id, updateData);
        }

        if (valueUpdate.name !== undefined) {
          await this.repository.translation.upsertOptionValueTranslation({
            projectId: this.getProjectId(),
            optionValueId: valueUpdate.id,
            locale: this.getLocale(),
            name: valueUpdate.name,
          });
        }
      }
    }

    // Create new values
    if (values.create?.length) {
      let sortIndex = existingValues.length > 0
        ? Math.max(...existingValues.map((v) => v.sortIndex)) + 1
        : 0;

      for (const valueInput of values.create) {
        let swatchId: string | null = null;
        if (valueInput.swatch) {
          swatchId = await this.createSwatch(valueInput.swatch);
        }

        const resolvedSortIndex = valueInput.sortIndex ?? sortIndex;
        sortIndex = Math.max(sortIndex + 1, resolvedSortIndex + 1);

        const optionValue = await this.repository.option.createValue(option.id, {
          slug: valueInput.slug,
          sortIndex: resolvedSortIndex,
          swatchId,
        });
        facetReferenceRefs.push(
          buildOptionValueChange({
            after: { option: { slug: nextOptionSlug }, value: optionValue },
            reason: "sourceValueCreated",
          })
        );

        await this.repository.translation.upsertOptionValueTranslation({
          projectId: this.getProjectId(),
          optionValueId: optionValue.id,
          locale: this.getLocale(),
          name: valueInput.name,
        });
      }
    }

    // Rebuild variant handles if any option value slugs changed
    if (changedValueIds.length > 0) {
      await this.rebuildAffectedVariantHandles(changedValueIds);
    }

    return { errors: [], facetReferenceRefs };
  }

  /**
   * Rebuild handles for all variants that use any of the given option values.
   * This is necessary when option value slugs change, as variant handles
   * are composed from option value slugs.
   */
  private async rebuildAffectedVariantHandles(valueIds: string[]): Promise<void> {
    const db = this.repository.db;
    const projectId = this.getProjectId();

    // Find all variant IDs that have any of these values linked
    const affectedLinks = await db
      .selectDistinct({
        variantId: productOptionVariantLink.variantId,
      })
      .from(productOptionVariantLink)
      .where(
        and(
          eq(productOptionVariantLink.projectId, projectId),
          inArray(productOptionVariantLink.optionValueId, valueIds)
        )
      );

    if (affectedLinks.length === 0) {
      return;
    }

    const variantIdArray = affectedLinks.map((l) => l.variantId);

    // Build new handles for all affected variants
    const newHandles = await buildVariantHandlesBatch(
      db,
      variantIdArray,
      projectId
    );

    // Update each variant with its new handle
    for (const [variantId, newHandle] of newHandles) {
      await db
        .update(variant)
        .set({ handle: newHandle })
        .where(eq(variant.id, variantId));
    }

    this.logger.info(
      { valueIds, affectedCount: variantIdArray.length },
      "Rebuilt variant handles after option value slug change"
    );
  }

  private async createSwatch(swatch: OptionSwatchInput): Promise<string> {
    const created = await this.repository.option.createSwatch({
      swatchType: swatch.swatchType,
      colorOne: swatch.colorOne ?? null,
      colorTwo: swatch.colorTwo ?? null,
      imageId: swatch.fileId ?? null,
      metadata: swatch.metadata ?? null,
    });
    return created.id;
  }

  protected handleError(_error: unknown): OptionUpdateResult {
    return {
      option: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function nextValueSlug(
  value: ProductOptionValue,
  values?: OptionValuesInput
): string {
  const update = values?.update?.find((item) => item.id === value.id);
  return update?.slug ?? value.slug;
}
