import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import type { FeatureUpdateParams, FeatureUpdateResult, FeatureValuesInput } from "./dto/index.js";
import { isValidSlug } from "../shared/slug.js";
import type { FacetReferenceChange } from "@shopana/events";
import type {
  ProductFeature,
  ProductFeatureValue,
} from "../../repositories/models/index.js";
import {
  buildFeatureSourceChange,
  buildFeatureValueChange,
  uniqueFacetReferenceChanges,
} from "../shared/facetReferenceRefs.js";

export class FeatureUpdateScript extends BaseScript<FeatureUpdateParams, FeatureUpdateResult> {
  protected async execute(params: FeatureUpdateParams): Promise<FeatureUpdateResult> {
    const { id, slug, name, values } = params;

    // 1. Check feature exists
    const existingFeature = await this.repository.feature.findById(id);
    if (!existingFeature) {
      return {
        feature: undefined,
        userErrors: [{ message: "Feature not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    if (existingFeature.isGroup && values) {
      return {
        feature: undefined,
        userErrors: [{
          message: "Groups cannot have values",
          field: ["values"],
          code: "INVALID_VALUES",
        }],
      };
    }
    const existingValues = existingFeature.isGroup
      ? []
      : await this.repository.feature.findValuesByFeatureId(id);

    if (slug !== undefined) {
      if (!isValidSlug(slug)) {
        return {
          feature: undefined,
          userErrors: [{ message: "Feature slug format is invalid", field: ["slug"], code: "INVALID_SLUG" }],
        };
      }

      if (slug !== existingFeature.slug) {
        const duplicate = await this.repository.feature.findBySlug(
          existingFeature.productId,
          slug
        );
        if (duplicate) {
          return {
            feature: undefined,
            userErrors: [{ message: `Feature with slug "${slug}" already exists`, field: ["slug"], code: "DUPLICATE" }],
          };
        }
      }
    }

    if (slug !== undefined) {
      await this.repository.feature.update(id, { slug });
    }

    // 2. Update translation if name provided
    if (name !== undefined) {
      await this.repository.translation.upsertFeatureTranslation({
        projectId: this.getProjectId(),
        featureId: id,
        locale: this.getLocale(),
        name,
      });
    }

    // 3. Handle values updates
    let valueFacetReferenceRefs: FacetReferenceChange[] = [];
    if (values) {
      const valueResult = await this.processValuesUpdate(
        existingFeature,
        slug ?? existingFeature.slug,
        existingValues,
        values
      );
      const { errors, facetReferenceRefs } = valueResult;
      if (errors.length > 0) {
        return { feature: undefined, userErrors: errors };
      }
      valueFacetReferenceRefs = facetReferenceRefs;
    }

    // 4. Fetch updated feature
    const feature = await this.repository.feature.findById(id);

    this.logger.info({ featureId: id }, "Feature updated");

    const deletedValueIds = new Set(values?.delete ?? []);

    return {
      feature: feature ?? undefined,
      facetReferenceRefs: existingFeature.isGroup
        ? []
        : uniqueFacetReferenceChanges([
            ...(slug !== undefined && slug !== existingFeature.slug
              ? [
                  buildFeatureSourceChange({
                    before: existingFeature,
                    after: { slug },
                    reason: "sourceUpdated",
                  }),
                  ...existingValues.flatMap((value) =>
                    deletedValueIds.has(value.id)
                      ? []
                      : [
                          buildFeatureValueChange({
                            before: { feature: existingFeature, value },
                            after: {
                              feature: { slug },
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
    feature: ProductFeature,
    nextFeatureSlug: string,
    existingValues: ProductFeatureValue[],
    values: FeatureValuesInput
  ): Promise<{
    errors: UserError[];
    facetReferenceRefs: FacetReferenceChange[];
  }> {
    const existingById = new Map(existingValues.map((value) => [value.id, value]));
    const facetReferenceRefs: FacetReferenceChange[] = [];

    // Value slugs that remain occupied after delete step.
    const deletedIds = new Set(values.delete ?? []);
    const occupiedSlugs = new Set(
      existingValues
        .filter((value) => !deletedIds.has(value.id))
        .map((value) => value.slug)
    );

    // Delete values
    if (values.delete?.length) {
      for (const valueId of values.delete) {
        const existingValue = existingById.get(valueId);
        if (!existingValue) {
          return {
            errors: [{ message: "Feature value not found", field: ["values", "delete"], code: "NOT_FOUND" }],
            facetReferenceRefs: [],
          };
        }
        facetReferenceRefs.push(
          buildFeatureValueChange({
            before: { feature, value: existingValue },
            reason: "sourceValueDeleted",
          })
        );
        await this.repository.feature.deleteValue(valueId);
      }
    }

    // Update existing values
    if (values.update?.length) {
      for (let i = 0; i < values.update.length; i++) {
        const valueUpdate = values.update[i];
        const existingValue = existingById.get(valueUpdate.id);
        if (!existingValue) {
          return {
            errors: [{ message: "Feature value not found", field: ["values", "update", String(i), "id"], code: "NOT_FOUND" }],
            facetReferenceRefs: [],
          };
        }

        if (valueUpdate.slug !== undefined) {
          if (!isValidSlug(valueUpdate.slug)) {
            return {
              errors: [
                {
                  message: "Feature value slug format is invalid",
                  field: ["values", "update", String(i), "slug"],
                  code: "INVALID_SLUG",
                },
              ],
              facetReferenceRefs: [],
            };
          }
          if (valueUpdate.slug !== existingValue.slug && occupiedSlugs.has(valueUpdate.slug)) {
            return {
              errors: [
                {
                  message: `Feature value slug "${valueUpdate.slug}" already exists`,
                  field: ["values", "update", String(i), "slug"],
                  code: "DUPLICATE",
                },
              ],
              facetReferenceRefs: [],
            };
          }
        }

        if (valueUpdate.slug !== undefined || valueUpdate.name !== undefined) {
          await this.repository.feature.updateValue(feature.id, valueUpdate.id, {
            slug: valueUpdate.slug,
          });
        }

        if (valueUpdate.slug !== undefined && valueUpdate.slug !== existingValue.slug) {
          facetReferenceRefs.push(
            buildFeatureValueChange({
              before: { feature, value: existingValue },
              after: {
                feature: { slug: nextFeatureSlug },
                value: { slug: valueUpdate.slug },
              },
              reason: "sourceValueUpdated",
            })
          );
          occupiedSlugs.delete(existingValue.slug);
          occupiedSlugs.add(valueUpdate.slug);
        }

        if (valueUpdate.name !== undefined) {
          await this.repository.translation.upsertFeatureValueTranslation({
            projectId: this.getProjectId(),
            featureValueId: valueUpdate.id,
            locale: this.getLocale(),
            name: valueUpdate.name,
          });
        }
      }
    }

    // Create new values
    if (values.create?.length) {
      let index = existingValues.length > 0
        ? Math.max(...existingValues.map((v) => v.index)) + 1
        : 0;

      for (let i = 0; i < values.create.length; i++) {
        const valueInput = values.create[i];
        if (!isValidSlug(valueInput.slug)) {
            return {
              errors: [
                {
                  message: "Feature value slug format is invalid",
                  field: ["values", "create", String(i), "slug"],
                  code: "INVALID_SLUG",
                },
              ],
              facetReferenceRefs: [],
            };
        }
        if (occupiedSlugs.has(valueInput.slug)) {
          return {
            errors: [
              {
                message: `Feature value slug "${valueInput.slug}" already exists`,
                field: ["values", "create", String(i), "slug"],
                code: "DUPLICATE",
              },
            ],
            facetReferenceRefs: [],
          };
        }

        const featureValue = await this.repository.feature.createValue(feature.id, {
          slug: valueInput.slug,
          index: index++,
        });
        facetReferenceRefs.push(
          buildFeatureValueChange({
            after: { feature: { slug: nextFeatureSlug }, value: featureValue },
            reason: "sourceValueCreated",
          })
        );
        occupiedSlugs.add(valueInput.slug);

        await this.repository.translation.upsertFeatureValueTranslation({
          projectId: this.getProjectId(),
          featureValueId: featureValue.id,
          locale: this.getLocale(),
          name: valueInput.name,
        });
      }
    }

    return { errors: [], facetReferenceRefs };
  }

  protected handleError(_error: unknown): FeatureUpdateResult {
    return {
      feature: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function nextValueSlug(
  value: ProductFeatureValue,
  values?: FeatureValuesInput
): string {
  const update = values?.update?.find((item) => item.id === value.id);
  return update?.slug ?? value.slug;
}
