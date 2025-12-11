import type { OrderByItem } from "../types.js";
import type { CursorParams, SortParam } from "./types.js";
import { InvalidCursorError } from "./cursor.js";

/** @internal */
export function parseSort(
  order: OrderByItem<string>[] | undefined,
  defaultField: string
): SortParam[] {
  if (!order || order.length === 0) {
    return [{ field: defaultField, direction: "desc" }];
  }

  return order.map((item) => ({
    field: item.field,
    direction: item.direction,
  }));
}

function compareFields(a: string, b: string): boolean {
  return a === b;
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
    if (seek.direction !== expected.direction) {
      throw new InvalidCursorError(
        `Cursor direction mismatch for field ${expected.field}: got ${seek.direction}, expected ${expected.direction}`
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
