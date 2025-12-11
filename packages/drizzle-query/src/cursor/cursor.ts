import type { OrderDirection } from "../types.js";
import type { CursorParams, SeekValue } from "./types.js";
import { base64UrlEncode, base64UrlDecode } from "./helpers.js";

// Re-export types for backwards compatibility
export type { SeekValue, CursorParams } from "./types.js";

// ============ Errors ============

export class InvalidCursorError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "InvalidCursorError";
    if (cause && typeof (this as Error & { cause?: unknown }).cause === "undefined") {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

// ============ Validation ============

function isOrderDirection(value: string): value is OrderDirection {
  return value === "asc" || value === "desc";
}

export function validateCursorParams(params: CursorParams | null | undefined): asserts params is CursorParams {
  if (!params) {
    throw new InvalidCursorError("Cursor params cannot be null");
  }
  if (!params.type?.trim()) {
    throw new InvalidCursorError("Cursor type cannot be empty");
  }
  if (typeof params.filtersHash !== "string") {
    throw new InvalidCursorError("Filters hash must be a string");
  }
  if (!Array.isArray(params.seek) || params.seek.length === 0) {
    throw new InvalidCursorError("Seek values cannot be empty");
  }

  params.seek.forEach((value, index) => {
    if (!value.field?.trim()) {
      throw new InvalidCursorError(`Field cannot be empty at index ${index}`);
    }
    if (!isOrderDirection(value.order)) {
      throw new InvalidCursorError(`Invalid order '${value.order}' at index ${index}`);
    }
  });
}

export function encode(params: CursorParams): string {
  validateCursorParams(params);
  const json = JSON.stringify(params);
  return base64UrlEncode(json);
}

// Date string patterns:
// - ISO 8601: 2025-12-11T12:21:30.992Z or 2025-12-11T12:21:30Z
// - Postgres: 2025-12-11 12:21:30.992+00 or 2025-12-11 12:21:30+00
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}(?::\d{2})?)$/;

/**
 * JSON reviver that converts date strings back to Date objects.
 * Handles both ISO 8601 format and Postgres timestamp format.
 * This is necessary because cursor values are serialized to JSON,
 * and when these values are used in WHERE clauses, drizzle-orm expects
 * Date objects for timestamp columns.
 */
function dateReviver(_key: string, value: unknown): unknown {
  if (typeof value === "string" && DATE_REGEX.test(value)) {
    return new Date(value);
  }
  return value;
}

export function decode(cursor: string): CursorParams {
  if (!cursor?.trim()) {
    throw new InvalidCursorError("Cursor string is empty");
  }

  let json: string;
  try {
    json = base64UrlDecode(cursor);
  } catch (error) {
    throw new InvalidCursorError("Failed to decode base64", error);
  }

  let params: CursorParams;
  try {
    params = JSON.parse(json, dateReviver) as CursorParams;
  } catch (error) {
    throw new InvalidCursorError("Failed to parse cursor JSON", error);
  }

  validateCursorParams(params);
  return params;
}
