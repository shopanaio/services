import type { OrderDirection } from "../types.js";
import type { CursorParams, SortParam } from "./types.js";
import { InvalidCursorError } from "./cursor.js";
import { snakeToCamel } from "./helpers.js";

function normalizeFieldName(segment: string): string {
  const pathSegments = segment.split(".");
  const normalized = pathSegments
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) {
        return "";
      }
      const hasUnderscore = trimmed.includes("_");
      const isUpper = trimmed === trimmed.toUpperCase();
      const base = hasUnderscore || isUpper ? trimmed.toLowerCase() : trimmed;
      return hasUnderscore ? snakeToCamel(base) : base;
    })
    .filter((part) => part.length > 0);

  return normalized.join(".");
}

function parseDirection(value: string | undefined): OrderDirection {
  if (!value) {
    return "desc";
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "asc" || normalized === "desc") {
    return normalized;
  }
  throw new InvalidCursorError(`Invalid sort order '${value}'`);
}

function applyMapper(field: string, mapper?: (field: string) => string): string {
  return mapper ? mapper(field) : field;
}

/** @internal */
export function parseSort(
  sort: string | undefined,
  defaultField: string,
  mapper?: (field: string) => string
): SortParam[] {
  const trimmedSort = sort?.trim();
  const parts = trimmedSort && trimmedSort.length > 0
    ? trimmedSort.split(",")
    : [defaultField ? `${defaultField}:desc` : ""];

  const params: SortParam[] = [];

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) {
      continue;
    }

    let fieldPart = part;
    let direction: OrderDirection = "desc";

    const colonIndex = part.lastIndexOf(":");
    if (colonIndex !== -1) {
      fieldPart = part.slice(0, colonIndex);
      direction = parseDirection(part.slice(colonIndex + 1));
    } else {
      const upper = part.toUpperCase();
      if (upper.endsWith("_ASC")) {
        fieldPart = part.slice(0, -4);
        direction = "asc";
      } else if (upper.endsWith("_DESC")) {
        fieldPart = part.slice(0, -5);
        direction = "desc";
      }
    }

    const normalizedField = normalizeFieldName(fieldPart);
    if (!normalizedField) {
      throw new InvalidCursorError(`Invalid sort format: empty field in '${part}'`);
    }

    params.push({
      field: applyMapper(normalizedField, mapper),
      order: direction,
    });
  }

  if (params.length === 0) {
    throw new InvalidCursorError("Invalid sort format: no valid sort fields provided");
  }

  return params;
}

function compareFields(a: string, b: string): boolean {
  if (a === b) {
    return true;
  }
  return normalizeFieldName(a) === normalizeFieldName(b);
}

/** @internal */
export function validateCursorOrder(
  cursor: CursorParams,
  sort: SortParam[],
  tieBreaker: string
): void {
  if (!cursor) {
    throw new InvalidCursorError("Cursor params is nil");
  }
  if (cursor.seek.length !== sort.length + 1) {
    throw new InvalidCursorError("Cursor sort order length mismatch");
  }

  for (let i = 0; i < sort.length; i++) {
    const seek = cursor.seek[i];
    const expected = sort[i];
    if (!compareFields(seek.field, expected.field)) {
      throw new InvalidCursorError(
        `Cursor field mismatch at index ${i}: got ${seek.field}, expected ${expected.field}`
      );
    }
    if (seek.order !== expected.order) {
      throw new InvalidCursorError(
        `Cursor order mismatch for field ${expected.field}: got ${seek.order}, expected ${expected.order}`
      );
    }
  }

  const last = cursor.seek[cursor.seek.length - 1];
  if (!compareFields(last.field, tieBreaker)) {
    throw new InvalidCursorError(
      `Cursor last seek field must be ${tieBreaker} (got ${last.field})`
    );
  }
}
