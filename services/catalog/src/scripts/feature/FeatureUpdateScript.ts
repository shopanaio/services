import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import type { FeatureUpdateParams, FeatureUpdateResult, FeatureValuesInput } from "./dto/index.js";
import { isValidSlug } from "../shared/slug.js";

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
    if (values) {
      const errors = await this.processValuesUpdate(id, values);
      if (errors.length > 0) {
        return { feature: undefined, userErrors: errors };
      }
    }

    // 4. Fetch updated feature
    const feature = await this.repository.feature.findById(id);

    this.logger.info({ featureId: id }, "Feature updated");

    return { feature: feature ?? undefined, userErrors: [] };
  }

  private async processValuesUpdate(
    featureId: string,
    values: FeatureValuesInput
  ): Promise<UserError[]> {
    const existingValues = await this.repository.feature.findValuesByFeatureId(featureId);
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
          return [{ message: "Feature value not found", field: ["values", "delete"], code: "NOT_FOUND" }];
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
          return [{ message: "Feature value not found", field: ["values", "update", String(i), "id"], code: "NOT_FOUND" }];
        }

        if (valueUpdate.slug !== undefined) {
          if (!isValidSlug(valueUpdate.slug)) {
            return [
              {
                message: "Feature value slug format is invalid",
                field: ["values", "update", String(i), "slug"],
                code: "INVALID_SLUG",
              },
            ];
          }
          if (valueUpdate.slug !== existingValue.slug && occupiedSlugs.has(valueUpdate.slug)) {
            return [
              {
                message: `Feature value slug "${valueUpdate.slug}" already exists`,
                field: ["values", "update", String(i), "slug"],
                code: "DUPLICATE",
              },
            ];
          }
        }

        if (valueUpdate.slug !== undefined || valueUpdate.name !== undefined) {
          await this.repository.feature.updateValue(featureId, valueUpdate.id, {
            slug: valueUpdate.slug,
          });
        }

        if (valueUpdate.slug !== undefined && valueUpdate.slug !== existingValue.slug) {
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
          return [
            {
              message: "Feature value slug format is invalid",
              field: ["values", "create", String(i), "slug"],
              code: "INVALID_SLUG",
            },
          ];
        }
        if (occupiedSlugs.has(valueInput.slug)) {
          return [
            {
              message: `Feature value slug "${valueInput.slug}" already exists`,
              field: ["values", "create", String(i), "slug"],
              code: "DUPLICATE",
            },
          ];
        }

        const featureValue = await this.repository.feature.createValue(featureId, {
          slug: valueInput.slug,
          index: index++,
        });
        occupiedSlugs.add(valueInput.slug);

        await this.repository.translation.upsertFeatureValueTranslation({
          projectId: this.getProjectId(),
          featureValueId: featureValue.id,
          locale: this.getLocale(),
          name: valueInput.name,
        });
      }
    }

    return [];
  }

  protected handleError(_error: unknown): FeatureUpdateResult {
    return {
      feature: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
