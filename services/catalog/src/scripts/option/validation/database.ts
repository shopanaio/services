import type { UserError } from "../../../kernel/BaseScript.js";
import type { OptionRepository } from "../../../repositories/option/OptionRepository.js";
import type { ValidatedOptionInput } from "./schema.js";

interface ExistingOption {
  id: string;
  productId: string;
}

export interface DbValidationContext {
  existingById: Map<string, ExistingOption>;
  valueIdsByOptionId: Map<string, Set<string>>;
}

/**
 * Loads data from DB for validation.
 */
export async function loadDbContext(
  repository: OptionRepository,
  productId: string,
  options: ValidatedOptionInput[]
): Promise<DbValidationContext> {
  const optionIds = options.flatMap((o) => (o.id ? [o.id] : []));
  const existing = await repository.findByIds(productId, optionIds);

  const optionIdsWithValues = options
    .filter((o) => o.id && o.values?.some((v) => v.id))
    .map((o) => o.id!);
  const valueIdMap = await repository.findValueIdsByOptionIds(optionIdsWithValues);

  return {
    existingById: new Map(existing.map((o) => [o.id, { id: o.id, productId: o.productId }])),
    valueIdsByOptionId: new Map(
      Array.from(valueIdMap.entries()).map(([k, v]) => [k, new Set(v)])
    ),
  };
}

/**
 * Validates ID ownership.
 * - Option IDs must belong to the product
 * - Value IDs must belong to their option
 * - New options cannot reference existing value IDs
 */
export function validateDatabase(
  options: ValidatedOptionInput[],
  ctx: DbValidationContext
): UserError[] {
  const errors: UserError[] = [];

  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const path = (field: string) => ["options", String(i), field];

    if (opt.id) {
      const existing = ctx.existingById.get(opt.id);

      // ID must belong to product
      if (!existing) {
        errors.push({
          message: `Option "${opt.id}" not found in this product`,
          field: path("id"),
          code: "NOT_FOUND",
        });
        continue;
      }
    }

    // Validate value ownership
    if (opt.id && opt.values) {
      const allowedValueIds = ctx.valueIdsByOptionId.get(opt.id) ?? new Set();

      for (let j = 0; j < opt.values.length; j++) {
        const v = opt.values[j];
        if (v.id && !allowedValueIds.has(v.id)) {
          errors.push({
            message: `Value "${v.id}" does not belong to this option`,
            field: ["options", String(i), "values", String(j), "id"],
            code: "VALUE_NOT_FOUND",
          });
        }
      }
    }

    // New option cannot reference existing values
    if (!opt.id && opt.values?.some((v) => v.id)) {
      errors.push({
        message: "New option cannot reference existing value IDs",
        field: path("values"),
        code: "INVALID_VALUE_REFERENCE",
      });
    }
  }

  return errors;
}
