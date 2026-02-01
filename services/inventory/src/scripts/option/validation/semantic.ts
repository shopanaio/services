import type { UserError } from "../../../kernel/BaseScript.js";
import type { ValidatedOptionInput, ValidatedValueInput } from "./schema.js";

/**
 * Validates business rules at input level (no DB).
 * Returns all found errors.
 */
export function validateSemantic(options: ValidatedOptionInput[]): UserError[] {
  const errors: UserError[] = [];
  const seenOptionIds = new Set<string>();
  const seenOptionSlugs = new Set<string>();
  const seenOptionIndexes = new Set<number>();
  const seenValueIds = new Set<string>();

  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const path = (field: string) => ["options", String(i), field];

    // Option ID uniqueness
    if (opt.id) {
      if (seenOptionIds.has(opt.id)) {
        errors.push({
          message: `Duplicate option id "${opt.id}"`,
          field: path("id"),
          code: "DUPLICATE_ID",
        });
      } else {
        seenOptionIds.add(opt.id);
      }
    }

    // Option slug uniqueness
    if (seenOptionSlugs.has(opt.slug)) {
      errors.push({
        message: `Duplicate option slug "${opt.slug}"`,
        field: path("slug"),
        code: "DUPLICATE_SLUG",
      });
    } else {
      seenOptionSlugs.add(opt.slug);
    }

    // Option index uniqueness
    if (seenOptionIndexes.has(opt.index)) {
      errors.push({
        message: `Duplicate option index ${opt.index}`,
        field: path("index"),
        code: "DUPLICATE_INDEX",
      });
    } else {
      seenOptionIndexes.add(opt.index);
    }

    // Validate values
    validateValues(opt.values, i, seenValueIds, errors);
  }

  return errors;
}

function validateValues(
  values: ValidatedValueInput[],
  optionArrayIdx: number,
  globalValueIds: Set<string>,
  errors: UserError[]
): void {
  const localSlugs = new Set<string>();
  const localIndexes = new Set<number>();

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const path = (field: string) => ["options", String(optionArrayIdx), "values", String(i), field];

    // Value ID uniqueness globally
    if (v.id) {
      if (globalValueIds.has(v.id)) {
        errors.push({
          message: `Duplicate value id "${v.id}"`,
          field: path("id"),
          code: "DUPLICATE_ID",
        });
      } else {
        globalValueIds.add(v.id);
      }
    }

    // Value slug uniqueness within option
    if (localSlugs.has(v.slug)) {
      errors.push({
        message: `Duplicate value slug "${v.slug}" within option`,
        field: path("slug"),
        code: "DUPLICATE_SLUG",
      });
    } else {
      localSlugs.add(v.slug);
    }

    // Value index uniqueness within option
    if (localIndexes.has(v.index)) {
      errors.push({
        message: `Duplicate value index ${v.index} within option`,
        field: path("index"),
        code: "DUPLICATE_INDEX",
      });
    } else {
      localIndexes.add(v.index);
    }
  }
}
