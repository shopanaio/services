import type { OrderDirection } from "../types.js";

// Note: We can't import from helpers.ts here due to circular dependency
// (helpers.ts imports SeekValue from cursor.ts)
// So we define minimal base64 helpers inline

function base64UrlEncode(json: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(json, "utf-8").toString("base64url");
  }

  const runtime = globalThis as typeof globalThis & {
    btoa?: (value: string) => string;
  };
  if (typeof runtime.btoa !== "function") {
    throw new Error("Base64 encoding is not supported in this environment");
  }
  return runtime
    .btoa(json)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(cursor: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(cursor, "base64url").toString("utf-8");
  }

  const runtime = globalThis as typeof globalThis & {
    atob?: (value: string) => string;
  };
  if (typeof runtime.atob !== "function") {
    throw new Error("Base64 decoding is not supported in this environment");
  }

  // Restore standard base64: replace URL-safe chars, then add padding
  const padded = cursor
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(cursor.length + ((4 - (cursor.length % 4)) % 4), "=");
  return runtime.atob(padded);
}

// ============ Types ============

export type SeekValue = {
  field: string;
  value: unknown;
  order: OrderDirection;
};

export type CursorParams = {
  type: string;
  filtersHash: string;
  seek: SeekValue[];
};

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
    params = JSON.parse(json) as CursorParams;
  } catch (error) {
    throw new InvalidCursorError("Failed to parse cursor JSON", error);
  }

  validateCursorParams(params);
  return params;
}
