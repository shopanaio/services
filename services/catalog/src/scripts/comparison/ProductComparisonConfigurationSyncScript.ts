import { BaseScript, Transactional, type UserError } from "../../kernel/BaseScript.js";
import type { Product } from "../../repositories/models/products.js";
import type {
  ComparisonField,
  ComparisonFieldOption,
} from "../../repositories/models/comparison.js";
import type { ComparisonNormalizedValueInput } from "../../repositories/comparison/comparison-types.js";
import type { ProductConfigurationMappingInput } from "./dto.js";
import { mapComparisonDatabaseError } from "./validation.js";
interface Params {
  productId: string;
  profileId: string;
  mappings: ProductConfigurationMappingInput[];
}
interface Result {
  product?: Product;
  userErrors: UserError[];
}
export class ProductComparisonConfigurationSyncScript extends BaseScript<Params, Result> {
  @Transactional() protected async execute(params: Params): Promise<Result> {
    const product = await this.repository.comparison.lockProduct(params.productId);
    if (!product)
      return {
        userErrors: [{ message: "Product not found", field: ["productId"], code: "INVALID_ID" }],
      };
    const effective = (
      await this.repository.comparisonRead.getEffectiveProfilesByProductIds([params.productId])
    )[0];
    if (!effective?.profileId || !effective.enabled || effective.profileId !== params.profileId)
      return {
        userErrors: [
          {
            message: "Profile does not match the product effective profile",
            field: ["profileId"],
            code: "COMPARISON_EFFECTIVE_PROFILE_MISMATCH",
          },
        ],
      };
    const fields = await this.repository.comparisonRead.getFieldsByProfileIds([params.profileId]);
    const fieldMap = new Map(fields.map((r) => [r.id, r]));
    const options = await this.repository.comparisonRead.getOptionsByFieldIds(
      fields.map((r) => r.id),
    );
    const optionMap = new Map(options.map((r) => [r.id, r]));
    if (
      new Set(params.mappings.map((r) => r.fieldId)).size !== params.mappings.length ||
      params.mappings.length !== fields.length ||
      params.mappings.some((r) => !fieldMap.has(r.fieldId))
    )
      return {
        userErrors: [
          {
            message: "Mappings must contain every effective-profile field exactly once",
            field: ["mappings"],
            code: "COMPARISON_FIELD_NOT_OWNED",
          },
        ],
      };
    for (const [index, mapping] of params.mappings.entries()) {
      const sources =
        Number(Boolean(mapping.feature)) +
        Number(Boolean(mapping.option)) +
        Number(Boolean(mapping.notApplicable));
      if (sources !== 1)
        return {
          userErrors: [
            {
              message: "Exactly one comparison source is required",
              field: ["mappings", String(index)],
              code: "COMPARISON_SOURCE_CONFLICT",
            },
          ],
        };
      const error = await this.validateSource(
        params.productId,
        fieldMap.get(mapping.fieldId)!,
        optionMap,
        mapping,
        index,
      );
      if (error) return { userErrors: [error] };
    }
    const updated = await this.repository.comparison.syncProductConfiguration(
      params.productId,
      params.profileId,
      params.mappings,
    );
    this.logger.info(
      { productId: params.productId, profileId: params.profileId },
      "comparison.product_configuration.synced",
    );
    return { product: updated, userErrors: [] };
  }
  private async validateSource(
    productId: string,
    field: ComparisonField,
    optionMap: Map<string, ComparisonFieldOption>,
    mapping: ProductConfigurationMappingInput,
    index: number,
  ): Promise<UserError | null> {
    const prefix = ["mappings", String(index)];
    if (mapping.feature) {
      const feature = await this.repository.feature.findById(mapping.feature.featureId);
      if (!feature || feature.productId !== productId)
        return {
          message: "Feature is not owned by product",
          field: [...prefix, "feature", "featureId"],
          code: "COMPARISON_LOCAL_VALUE_NOT_OWNED",
        };
      if (feature.isGroup)
        return {
          message: "Feature must be a leaf",
          field: [...prefix, "feature", "featureId"],
          code: "COMPARISON_FEATURE_NOT_LEAF",
        };
      const values = await this.repository.feature.getValuesByIds(
        mapping.feature.values.map((r) => r.valueId),
      );
      if (
        values.length !== mapping.feature.values.length ||
        values.some((r) => r.featureId !== feature.id)
      )
        return {
          message: "Feature value is not owned by feature",
          field: [...prefix, "feature", "values"],
          code: "COMPARISON_LOCAL_VALUE_NOT_OWNED",
        };
      if (field.cardinality === "SINGLE" && mapping.feature.values.length > 1)
        return {
          message: "SINGLE field accepts one value",
          field: [...prefix, "feature", "values"],
          code: "COMPARISON_NORMALIZED_VALUE_INVALID",
        };
      return this.validateValues(field, optionMap, mapping.feature.values, [
        ...prefix,
        "feature",
        "values",
      ]);
    }
    if (mapping.option) {
      if (field.cardinality !== "SINGLE")
        return {
          message: "Option requires SINGLE field",
          field: [...prefix, "option"],
          code: "COMPARISON_OPTION_REQUIRES_SINGLE",
        };
      const option = await this.repository.option.findById(mapping.option.optionId);
      if (!option || option.productId !== productId)
        return {
          message: "Option is not owned by product",
          field: [...prefix, "option", "optionId"],
          code: "COMPARISON_LOCAL_VALUE_NOT_OWNED",
        };
      const values = await this.repository.option.getValuesByIds(
        mapping.option.values.map((r) => r.valueId),
      );
      if (
        values.length !== mapping.option.values.length ||
        values.some((r) => r.optionId !== option.id)
      )
        return {
          message: "Option value is not owned by option",
          field: [...prefix, "option", "values"],
          code: "COMPARISON_LOCAL_VALUE_NOT_OWNED",
        };
      return this.validateValues(field, optionMap, mapping.option.values, [
        ...prefix,
        "option",
        "values",
      ]);
    }
    return null;
  }
  private validateValues(
    field: ComparisonField,
    optionMap: Map<string, ComparisonFieldOption>,
    values: Array<{ normalized: ComparisonNormalizedValueInput }>,
    prefix: string[],
  ): UserError | null {
    for (const [index, item] of values.entries()) {
      const n = item.normalized;
      const present = [
        n.booleanValue,
        n.decimalValue,
        n.integerValue,
        n.textValue,
        n.fieldOptionId,
      ].filter((v) => v !== null && v !== undefined);
      const valid =
        present.length === 1 &&
        ((field.valueType === "BOOLEAN" && n.booleanValue != null) ||
          (field.valueType === "DECIMAL" &&
            n.decimalValue != null &&
            Number.isFinite(Number(n.decimalValue))) ||
          (field.valueType === "INTEGER" &&
            n.integerValue != null &&
            /^-?\d+$/.test(String(n.integerValue))) ||
          (field.valueType === "TEXT" && Boolean(n.textValue?.trim())) ||
          (field.valueType === "ENUM" &&
            n.fieldOptionId != null &&
            optionMap.get(n.fieldOptionId)?.fieldId === field.id));
      if (!valid)
        return {
          message: "Normalized value does not match target field",
          field: [...prefix, String(index), "value"],
          code: "COMPARISON_NORMALIZED_VALUE_INVALID",
        };
    }
    return null;
  }
  protected handleError(error: unknown): Result {
    return { userErrors: mapComparisonDatabaseError(error) };
  }
}
