import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import type { FeatureUpdateParams, FeatureUpdateResult, FeatureValuesInput } from "./dto/index.js";

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

    // 2. Check slug uniqueness if changing
    if (slug !== undefined && slug !== existingFeature.slug) {
      const featureWithSlug = await this.repository.feature.findBySlug(
        existingFeature.productId,
        slug
      );
      if (featureWithSlug) {
        return {
          feature: undefined,
          userErrors: [{
            message: `Feature with slug "${slug}" already exists`,
            field: ["slug"],
            code: "SLUG_ALREADY_EXISTS",
          }],
        };
      }
    }

    // 3. Update feature
    if (slug !== undefined) {
      await this.repository.feature.update(id, { slug });
    }

    // 4. Update translation if name provided
    if (name !== undefined) {
      await this.repository.translation.upsertFeatureTranslation({
        projectId: this.getProjectId(),
        featureId: id,
        locale: this.getLocale(),
        name,
      });
    }

    // 5. Handle values updates
    if (values) {
      const errors = await this.processValuesUpdate(id, values);
      if (errors.length > 0) {
        return { feature: undefined, userErrors: errors };
      }
    }

    // 6. Fetch updated feature
    const feature = await this.repository.feature.findById(id);

    this.logger.info({ featureId: id }, "Feature updated");

    return { feature: feature ?? undefined, userErrors: [] };
  }

  private async processValuesUpdate(
    featureId: string,
    values: FeatureValuesInput
  ): Promise<UserError[]> {
    // Delete values
    if (values.delete?.length) {
      for (const valueId of values.delete) {
        const existingValue = await this.repository.feature.findValueById(valueId);
        if (!existingValue) {
          return [{ message: "Feature value not found", field: ["values", "delete"], code: "NOT_FOUND" }];
        }
        await this.repository.feature.deleteValue(valueId);
      }
    }

    // Update existing values
    if (values.update?.length) {
      for (const valueUpdate of values.update) {
        const existingValue = await this.repository.feature.findValueById(valueUpdate.id);
        if (!existingValue) {
          return [{ message: "Feature value not found", field: ["values", "update"], code: "NOT_FOUND" }];
        }

        if (valueUpdate.slug !== undefined) {
          await this.repository.feature.updateValue(valueUpdate.id, { slug: valueUpdate.slug });
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
      const existingValues = await this.repository.feature.findValuesByFeatureId(featureId);
      let sortIndex = existingValues.length > 0
        ? Math.max(...existingValues.map((v) => v.sortIndex)) + 1
        : 0;

      for (const valueInput of values.create) {
        const featureValue = await this.repository.feature.createValue(featureId, {
          slug: valueInput.slug,
          sortIndex: sortIndex++,
        });

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
