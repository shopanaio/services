import type { UserError } from "../../kernel/BaseScript.js";

export function parsePositiveBigInt(
  value: string | null | undefined,
  field: string[],
  errors: UserError[],
): bigint | null {
  if (value == null) return null;
  try {
    const parsed = BigInt(value);
    if (parsed <= 0n) throw new Error("not positive");
    return parsed;
  } catch {
    errors.push({
      message: "Value must be a positive integer",
      code: "INVALID_BIGINT",
      field,
    });
    return null;
  }
}

export function parseNonNegativeBigInt(
  value: string | null | undefined,
  field: string[],
  errors: UserError[],
): bigint | null {
  if (value == null) return null;
  try {
    const parsed = BigInt(value);
    if (parsed < 0n) throw new Error("negative");
    return parsed;
  } catch {
    errors.push({
      message: "Value must be a non-negative integer",
      code: "INVALID_BIGINT",
      field,
    });
    return null;
  }
}

export function parseDateTime(value: string, field: string[], errors: UserError[]): string | null {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    errors.push({
      message: "Value must be a valid date-time",
      code: "INVALID_DATE_TIME",
      field,
    });
    return null;
  }
  return new Date(timestamp).toISOString();
}

export function hasOwn(input: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(input, field);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
