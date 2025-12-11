import type { FieldsDef, NestedWhereInput, OrderDirection } from "../types.js";
import type { CursorParams } from "./types.js";

type ComparisonOperator = "_lt" | "_gt";

/**
 * Filter operators for cursor values.
 * Uses `unknown` instead of `ScalarValue` since cursor values
 * are serialized/deserialized from JSON and may have any type.
 */
type CursorFilterOperators = {
  _eq?: unknown;
  _lt?: unknown;
  _gt?: unknown;
};

function getComparisonOperator(forward: boolean, order: OrderDirection): ComparisonOperator {
  if (forward) {
    return order === "desc" ? "_lt" : "_gt";
  }
  return order === "desc" ? "_gt" : "_lt";
}

function setPathCondition(target: Record<string, unknown>, path: string, filter: CursorFilterOperators): void {
  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) {
    return;
  }

  let cursor: Record<string, unknown> = target;
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    const existing = cursor[segment];
    if (typeof existing === "object" && existing !== null && !Array.isArray(existing)) {
      cursor = existing as Record<string, unknown>;
    } else {
      const next: Record<string, unknown> = {};
      cursor[segment] = next;
      cursor = next;
    }
  }

  cursor[segments[segments.length - 1]] = filter;
}

/** @internal */
export function buildCursorWhereInput<F extends FieldsDef = FieldsDef>(
  params: CursorParams,
  forward: boolean
): NestedWhereInput<F> {
  if (!params.seek.length) {
    return {} as NestedWhereInput<F>;
  }

  const orConditions: NestedWhereInput<F>[] = [];

  params.seek.forEach((seekValue, index) => {
    const condition: Record<string, unknown> = {};

    for (let i = 0; i < index; i++) {
      const previous = params.seek[i];
      setPathCondition(condition, previous.field, { _eq: previous.value });
    }

    const operator = getComparisonOperator(forward, seekValue.direction);
    setPathCondition(condition, seekValue.field, { [operator]: seekValue.value });

    orConditions.push(condition as NestedWhereInput<F>);
  });

  return { _or: orConditions } as NestedWhereInput<F>;
}
