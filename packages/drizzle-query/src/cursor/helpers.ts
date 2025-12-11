import type { OrderDirection } from "../types.js";
import type { SeekValue, SortParam } from "./types.js";

// Re-export types for backwards compatibility
export type { SortParam } from "./types.js";

// ============ Base64URL Encoding ============

/**
 * Encodes a UTF-8 string to base64url (URL-safe, no padding).
 * Works in both Node.js and browser environments.
 */
export function base64UrlEncode(value: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf-8").toString("base64url");
  }

  const runtime = globalThis as typeof globalThis & {
    btoa?: (input: string) => string;
  };
  if (typeof runtime.btoa !== "function") {
    throw new Error("Base64 encoding is not supported in this environment");
  }
  return runtime
    .btoa(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Decodes a base64url string to UTF-8.
 * Works in both Node.js and browser environments.
 */
export function base64UrlDecode(value: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64url").toString("utf-8");
  }

  const runtime = globalThis as typeof globalThis & {
    atob?: (input: string) => string;
  };
  if (typeof runtime.atob !== "function") {
    throw new Error("Base64 decoding is not supported in this environment");
  }

  // Restore standard base64: replace URL-safe chars, then add padding
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  return runtime.atob(padded);
}

// ============ Types ============

export type BuildTieBreakerInput = {
  value: unknown;
  tieBreaker: string;
  sortParams: SortParam[];
  order?: OrderDirection;
};

export function snakeToCamel(value: string): string {
  if (!value.includes("_")) {
    return value;
  }

  return value
    .toLowerCase()
    .replace(/_+([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

export function cloneSortParams(
  params: SortParam[] | undefined | null
): SortParam[] {
  if (!params || params.length === 0) {
    return [];
  }
  return params.map((param) => ({ ...param }));
}

export function tieBreakerOrder(sortParams: SortParam[]): OrderDirection {
  if (sortParams.length === 0) {
    return "desc";
  }
  const last = sortParams[sortParams.length - 1];
  return last.order === "asc" ? "asc" : "desc";
}

export function invertOrder(direction: OrderDirection): OrderDirection {
  return direction === "asc" ? "desc" : "asc";
}

export function buildTieBreakerSeekValue(
  input: BuildTieBreakerInput
): SeekValue {
  const order = input.order ?? tieBreakerOrder(input.sortParams);
  return {
    field: input.tieBreaker,
    value: input.value,
    order,
  };
}

function normalizeValue(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, val]) => val !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    const normalized: Record<string, unknown> = {};
    for (const [key, val] of entries) {
      normalized[key] = normalizeValue(val);
    }
    return normalized;
  }

  return value;
}

export function hashFilters(
  filters: Record<string, unknown> | null | undefined
): string {
  if (!filters || Object.keys(filters).length === 0) {
    return "";
  }

  const normalized = normalizeValue(filters);
  if (typeof normalized !== "object" || normalized === null) {
    return "";
  }

  const json = JSON.stringify(normalized);
  if (json === "{}") {
    return "";
  }

  const encoded = base64UrlEncode(json);
  if (encoded.length <= 16) {
    return encoded;
  }
  const head = encoded.slice(0, 8);
  const tail = encoded.slice(-8);
  return `${head}${tail}`;
}

/**
 * Get a value from a nested object using dot notation path.
 *
 * @example
 * ```ts
 * const row = { id: "1", category: { name: "Electronics" } };
 * getNestedValue(row, "id"); // "1"
 * getNestedValue(row, "category.name"); // "Electronics"
 * ```
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined) {
    return undefined;
  }

  const segments = path.split(".");
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}
