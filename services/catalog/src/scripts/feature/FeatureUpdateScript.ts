import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import type { FeatureUpdateParams, FeatureUpdateResult, FeatureValuesInput } from "./dto/index.js";
import { normalizeCollectionRuleHandleV1 } from "@shopana/broker-types";
import type { ProductFeature, ProductFeatureValue } from "../../repositories/models/index.js";

export class FeatureUpdateScript extends BaseScript<FeatureUpdateParams, FeatureUpdateResult> {
  protected async execute(params: FeatureUpdateParams): Promise<FeatureUpdateResult> {
    const { id, slug: rawSlug, name, featured, values } = params;
    let slug = rawSlug;
    if (rawSlug !== undefined) {
      try {
        slug = normalizeCollectionRuleHandleV1(rawSlug);
      } catch {
        return {
          feature: undefined,
          userErrors: [{ message: "Feature slug format is invalid", field: ["slug"], code: "INVALID_SLUG" }],
        };
      }
    }

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

    if (slug !== undefined || featured !== undefined) {
      const featureUpdate: { slug?: string; featured?: boolean } = {};
      if (slug !== undefined) featureUpdate.slug = slug;
      if (featured !== undefined) featureUpdate.featured = featured;
      await this.repository.feature.update(id, featureUpdate);
    }

    // 2. Update translation if name provided
    if (name !== undefined) {
      await this.repository.translation.upsertFeatureTranslation({
        storeId: this.getProjectId(),
        featureId: id,
        locale: this.getLocale(),
        name,
      });
    }

    // 3. Handle values updates
    if (values) {
      const valueResult = await this.processValuesUpdate(
        existingFeature,
        existingValues,
        values
      );
      const { errors } = valueResult;
      if (errors.length > 0) {
        return { feature: undefined, userErrors: errors };
      }
    }

    // 4. Fetch updated feature
    const feature = await this.repository.feature.findById(id);

    this.logger.info({ featureId: id }, "Feature updated");

    return {
      feature: feature ?? undefined,
      userErrors: [],
    };
  }

  private async processValuesUpdate(
    feature: ProductFeature,
    existingValues: ProductFeatureValue[],
    values: FeatureValuesInput
  ): Promise<{
    errors: UserError[];
  }> {
    const existingById = new Map(existingValues.map((value) => [value.id, value]));

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
          };
        }
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
          };
        }

        let canonicalValueSlug = valueUpdate.slug;
        if (valueUpdate.slug !== undefined) {
          let canonicalSlug: string;
          try {
            canonicalSlug = normalizeCollectionRuleHandleV1(valueUpdate.slug);
          } catch {
            return {
              errors: [
                {
                  message: "Feature value slug format is invalid",
                  field: ["values", "update", String(i), "slug"],
                  code: "INVALID_SLUG",
                },
              ],
            };
          }
          if (canonicalSlug !== existingValue.slug && occupiedSlugs.has(canonicalSlug)) {
            return {
              errors: [
                {
                  message: `Feature value slug "${canonicalSlug}" already exists`,
                  field: ["values", "update", String(i), "slug"],
                  code: "DUPLICATE",
                },
              ],
            };
          }
          canonicalValueSlug = canonicalSlug;
        }

        if (valueUpdate.slug !== undefined || valueUpdate.name !== undefined) {
          await this.repository.feature.updateValue(feature.id, valueUpdate.id, {
            slug: canonicalValueSlug,
          });
        }

        if (canonicalValueSlug !== undefined && canonicalValueSlug !== existingValue.slug) {
          occupiedSlugs.delete(existingValue.slug);
          occupiedSlugs.add(canonicalValueSlug);
        }

        if (valueUpdate.name !== undefined) {
          await this.repository.translation.upsertFeatureValueTranslation({
            storeId: this.getProjectId(),
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
        let canonicalSlug: string;
        try {
          canonicalSlug = normalizeCollectionRuleHandleV1(valueInput.slug);
        } catch {
            return {
              errors: [
                {
                  message: "Feature value slug format is invalid",
                  field: ["values", "create", String(i), "slug"],
                  code: "INVALID_SLUG",
                },
              ],
            };
        }
        if (occupiedSlugs.has(canonicalSlug)) {
          return {
            errors: [
              {
                message: `Feature value slug "${canonicalSlug}" already exists`,
                field: ["values", "create", String(i), "slug"],
                code: "DUPLICATE",
              },
            ],
          };
        }

        const featureValue = await this.repository.feature.createValue(feature.id, {
          slug: canonicalSlug,
          index: index++,
        });
        occupiedSlugs.add(canonicalSlug);

        await this.repository.translation.upsertFeatureValueTranslation({
          storeId: this.getProjectId(),
          featureValueId: featureValue.id,
          locale: this.getLocale(),
          name: valueInput.name,
        });
      }
    }

    return { errors: [] };
  }

  protected handleError(_error: unknown): FeatureUpdateResult {
    return {
      feature: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
