import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import type { FeatureUpdateParams, FeatureUpdateResult, FeatureValuesInput } from "./dto/index.js";

export class FeatureUpdateScript extends BaseScript<FeatureUpdateParams, FeatureUpdateResult> {
  protected async execute(params: FeatureUpdateParams): Promise<FeatureUpdateResult> {
    const { id, name, values } = params;

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

    // Update existing values (only name now, no slug)
    if (values.update?.length) {
      for (const valueUpdate of values.update) {
        const existingValue = await this.repository.feature.findValueById(valueUpdate.id);
        if (!existingValue) {
          return [{ message: "Feature value not found", field: ["values", "update"], code: "NOT_FOUND" }];
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
      let index = existingValues.length > 0
        ? Math.max(...existingValues.map((v) => v.index)) + 1
        : 0;

      for (const valueInput of values.create) {
        const featureValue = await this.repository.feature.createValue(featureId, {
          index: index++,
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
