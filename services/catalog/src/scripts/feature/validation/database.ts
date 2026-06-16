import type { UserError } from "../../../kernel/BaseScript.js";
import type { FeatureRepository } from "../../../repositories/feature/FeatureRepository.js";
import type { ValidatedFeatureInput } from "./schema.js";

interface ExistingFeature {
  id: string;
  isGroup: boolean;
}

export interface DbValidationContext {
  existingById: Map<string, ExistingFeature>;
  valueIdsByFeatureId: Map<string, Set<string>>;
}

/**
 * Loads data from DB for validation.
 * One batch query for features, one for values.
 */
export async function loadDbContext(
  repository: FeatureRepository,
  productId: string,
  features: ValidatedFeatureInput[]
): Promise<DbValidationContext> {
  const featureIds = features.flatMap((f) => (f.id ? [f.id] : []));
  const existing = await repository.findByIds(productId, featureIds);

  const featureIdsWithValues = features
    .filter((f) => f.id && f.values?.some((v) => v.id))
    .map((f) => f.id!);
  const valueIdMap = await repository.findValueIdsByFeatureIds(featureIdsWithValues);

  return {
    existingById: new Map(existing.map((f) => [f.id, { id: f.id, isGroup: f.isGroup }])),
    valueIdsByFeatureId: new Map(
      Array.from(valueIdMap.entries()).map(([k, v]) => [k, new Set(v)])
    ),
  };
}

/**
 * Validates ID ownership and immutable constraints.
 */
export function validateDatabase(
  features: ValidatedFeatureInput[],
  ctx: DbValidationContext
): UserError[] {
  const errors: UserError[] = [];

  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    const path = (field: string) => ["features", String(i), field];

    if (f.id) {
      const existing = ctx.existingById.get(f.id);

      // ID must belong to product
      if (!existing) {
        errors.push({
          message: `Feature "${f.id}" not found in this product`,
          field: path("id"),
          code: "NOT_FOUND",
        });
        continue;
      }

      // Cannot change type (group <-> attribute)
      if (existing.isGroup !== f.isGroup) {
        errors.push({
          message: "Cannot change feature type (group <-> attribute)",
          field: path("isGroup"),
          code: "TYPE_CHANGE_FORBIDDEN",
        });
      }
    }

    // Validate value ownership
    if (f.id && f.values) {
      const allowedValueIds = ctx.valueIdsByFeatureId.get(f.id) ?? new Set();

      for (let j = 0; j < f.values.length; j++) {
        const v = f.values[j];
        if (v.id && !allowedValueIds.has(v.id)) {
          errors.push({
            message: `Value "${v.id}" does not belong to this feature`,
            field: ["features", String(i), "values", String(j), "id"],
            code: "VALUE_NOT_FOUND",
          });
        }
      }
    }

    // New feature cannot reference existing values
    if (!f.id && f.values?.some((v) => v.id)) {
      errors.push({
        message: "New feature cannot reference existing value IDs",
        field: path("values"),
        code: "INVALID_VALUE_REFERENCE",
      });
    }
  }

  return errors;
}
