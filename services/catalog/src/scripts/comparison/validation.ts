import type { UserError } from "../../kernel/BaseScript.js";
import type { ComparisonProfileNestedInput } from "./dto.js";

const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UNITS = new Set(["mm", "cm", "m", "g", "kg", "byte", "kB", "MB", "GB", "Hz", "kHz", "MHz", "GHz", "W", "V", "mAh", "%", "°C"]);

export function validateProfileInput(input: ComparisonProfileNestedInput): UserError[] {
  const errors: UserError[] = [];
  const required = (value: string, field: string[]) => { if (!value.trim()) errors.push({ message: "Value must not be empty", field, code: "COMPARISON_FIELD_TYPE_INVALID" }); };
  required(input.name, ["name"]); required(input.missingLabel, ["missingLabel"]); required(input.notApplicableLabel, ["notApplicableLabel"]); required(input.unavailableLabel, ["unavailableLabel"]);
  if (!HANDLE.test(input.handle)) errors.push({ message: "Invalid comparison profile handle", field: ["handle"], code: "COMPARISON_FIELD_TYPE_INVALID" });
  duplicates(input.groups.map((row) => row.handle), ["groups"], "handle", errors);
  duplicates(input.groups.map((row) => row.sortIndex), ["groups"], "sortIndex", errors);
  duplicates(input.groups.flatMap((group) => group.fields.map((field) => field.handle)), ["groups"], "fieldHandle", errors);
  for (const [gi, group] of input.groups.entries()) {
    required(group.name, ["groups", String(gi), "name"]);
    duplicates(group.fields.map((row) => row.sortIndex), ["groups", String(gi), "fields"], "sortIndex", errors);
    for (const [fi, field] of group.fields.entries()) {
      const path = ["groups", String(gi), "fields", String(fi)]; required(field.name, [...path, "name"]);
      if (!HANDLE.test(field.handle)) errors.push({ message: "Invalid comparison field handle", field: [...path, "handle"], code: "COMPARISON_FIELD_TYPE_INVALID" });
      if (field.canonicalUnit && !["DECIMAL", "INTEGER"].includes(field.valueType)) errors.push({ message: "Canonical unit is allowed only for numeric fields", field: [...path, "canonicalUnit"], code: "COMPARISON_UNIT_INVALID" });
      if (field.canonicalUnit && !UNITS.has(field.canonicalUnit)) errors.push({ message: "Unknown canonical unit", field: [...path, "canonicalUnit"], code: "COMPARISON_UNIT_INVALID" });
      if (field.valueType !== "ENUM" && field.options.length > 0) errors.push({ message: "Only ENUM fields may define options", field: [...path, "options"], code: "COMPARISON_ENUM_OPTION_INVALID" });
      if (field.valueType === "ENUM" && field.options.length === 0) errors.push({ message: "ENUM field requires options", field: [...path, "options"], code: "COMPARISON_ENUM_OPTION_INVALID" });
      duplicates(field.options.map((row) => row.handle), [...path, "options"], "handle", errors);
      duplicates(field.options.map((row) => row.sortIndex), [...path, "options"], "sortIndex", errors);
    }
  }
  return errors;
}
function duplicates(values: Array<string | number>, prefix: string[], leaf: string, errors: UserError[]) { const seen = new Set<string | number>(); values.forEach((value, index) => { if (seen.has(value)) errors.push({ message: `Duplicate ${leaf}`, field: [...prefix, String(index), leaf], code: "COMPARISON_FIELD_TYPE_INVALID" }); seen.add(value); }); }
export function mapComparisonDatabaseError(error: unknown): UserError[] {
  const message = error instanceof Error ? error.message : ""; const code = (error as { code?: string })?.code;
  if (code === "23505" && message.includes("comparison_profile_store_id_handle")) return [{ message: "Comparison profile handle is already used", field: ["handle"], code: "COMPARISON_PROFILE_HANDLE_TAKEN" }];
  if (code === "23503") return [{ message: "Comparison field is in use", code: "COMPARISON_FIELD_IN_USE" }];
  if (message.includes("cannot change") && message.includes("comparison field")) return [{ message: "Populated comparison field semantics cannot be changed", code: "COMPARISON_UNIT_POPULATED" }];
  if (message.includes("leaf")) return [{ message: "Comparison source must be a leaf feature", code: "COMPARISON_FEATURE_NOT_LEAF" }];
  if (message.includes("SINGLE")) return [{ message: "Option mapping requires a SINGLE field", code: "COMPARISON_OPTION_REQUIRES_SINGLE" }];
  if (message.includes("conflict") || message.includes("NOT_APPLICABLE")) return [{ message: "Comparison source conflicts with another source", code: "COMPARISON_SOURCE_CONFLICT" }];
  return [{ message: "Comparison operation failed", code: "INTERNAL_ERROR" }];
}
