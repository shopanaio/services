import {
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  like,
  ilike,
  notLike,
  notIlike,
  inArray,
  notInArray,
  isNull,
  isNotNull,
  and,
  sql,
  type SQL,
  type Column,
} from "drizzle-orm";

/**
 * Operator names matching goqutil V3 format
 */
export const OPERATORS = {
  $eq: "eq",
  $neq: "neq",
  $gt: "gt",
  $gte: "gte",
  $lt: "lt",
  $lte: "lte",
  $in: "in",
  $notIn: "notIn",
  $is: "is",
  $isNot: "isNot",
  // String convenience operators
  $contains: "contains",
  $notContains: "notContains",
  $containsi: "containsi",
  $notContainsi: "notContainsi",
  $startsWith: "startsWith",
  $startsWithi: "startsWithi",
  $endsWith: "endsWith",
  $endsWithi: "endsWithi",
  // Range operator
  $between: "between",
} as const;

export type OperatorKey = keyof typeof OPERATORS;

type OperatorHandler = (column: Column, value: unknown) => SQL | null;

/**
 * Escape SQL wildcards in user input for safe LIKE operations.
 * Prevents user input from being interpreted as wildcards.
 */
function escapeWildcards(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

const OPERATOR_HANDLERS: Record<string, OperatorHandler> = {
  eq: (column, value) => eq(column, value),
  neq: (column, value) => ne(column, value),
  gt: (column, value) => gt(column, value),
  gte: (column, value) => gte(column, value),
  lt: (column, value) => lt(column, value),
  lte: (column, value) => lte(column, value),
  in: (column, value) => {
    if (!Array.isArray(value)) {
      return null;
    }
    if (value.length === 0) {
      return sql`FALSE`;
    }
    return inArray(column, value);
  },
  notin: (column, value) => {
    if (!Array.isArray(value)) {
      return null;
    }
    if (value.length === 0) {
      return sql`TRUE`;
    }
    return notInArray(column, value);
  },
  is: (column, value) => (value === null ? isNull(column) : null),
  isnot: (column, value) => (value === null ? isNotNull(column) : null),
  // String convenience operators
  contains: (column, value) =>
    typeof value === "string" ? like(column, `%${escapeWildcards(value)}%`) : null,
  notcontains: (column, value) =>
    typeof value === "string" ? notLike(column, `%${escapeWildcards(value)}%`) : null,
  containsi: (column, value) =>
    typeof value === "string" ? ilike(column, `%${escapeWildcards(value)}%`) : null,
  notcontainsi: (column, value) =>
    typeof value === "string" ? notIlike(column, `%${escapeWildcards(value)}%`) : null,
  startswith: (column, value) =>
    typeof value === "string" ? like(column, `${escapeWildcards(value)}%`) : null,
  startswithi: (column, value) =>
    typeof value === "string" ? ilike(column, `${escapeWildcards(value)}%`) : null,
  endswith: (column, value) =>
    typeof value === "string" ? like(column, `%${escapeWildcards(value)}`) : null,
  endswithi: (column, value) =>
    typeof value === "string" ? ilike(column, `%${escapeWildcards(value)}`) : null,
  // Range operator
  between: (column, value) => {
    if (!Array.isArray(value) || value.length !== 2) return null;
    // and() with 2 arguments always returns SQL, not undefined
    return and(gte(column, value[0]), lte(column, value[1]))!;
  },
} as const;

/**
 * Check if a key is an operator (starts with $)
 */
export function isOperator(key: string): key is OperatorKey {
  return key.startsWith("$") && key in OPERATORS;
}

/**
 * Check if a key is a logical operator ($and, $or, $not)
 */
export function isLogicalOperator(key: string): key is "$and" | "$or" | "$not" {
  return key === "$and" || key === "$or" || key === "$not";
}

/**
 * Build SQL condition from operator and value
 * Matches goqutil V3 operator handling
 */
export function buildOperatorCondition(
  column: Column,
  operator: string,
  value: unknown
): SQL | null {
  // Normalize operator (remove $ prefix and lowercase)
  const op = operator.startsWith("$")
    ? operator.slice(1).toLowerCase()
    : operator.toLowerCase();

  const handler = OPERATOR_HANDLERS[op];
  return handler ? handler(column, value) : null;
}

/**
 * Check if an object contains only operator keys
 */
export function isFilterObject(obj: unknown): obj is Record<string, unknown> {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    return false;
  }

  const keys = Object.keys(obj);
  return keys.length > 0 && keys.every((k) => k.startsWith("$"));
}

export function validateFilterValue(
  operator: string,
  value: unknown
): { valid: boolean; reason?: string } {
  const op = operator.startsWith("$")
    ? operator.slice(1).toLowerCase()
    : operator.toLowerCase();

  switch (op) {
    case "contains":
    case "notcontains":
    case "containsi":
    case "notcontainsi":
    case "startswith":
    case "startswithi":
    case "endswith":
    case "endswithi":
      if (typeof value !== "string") {
        return { valid: false, reason: "Expected string value" };
      }
      if (value.length > 1000) {
        return { valid: false, reason: "Value is too long" };
      }
      return { valid: true };
    case "in":
    case "notin":
      if (!Array.isArray(value)) {
        return { valid: false, reason: "Expected array value" };
      }
      return { valid: true };
    case "between":
      if (!Array.isArray(value) || value.length !== 2) {
        return { valid: false, reason: "Expected array with exactly 2 elements" };
      }
      return { valid: true };
    case "is":
    case "isnot":
      if (value !== null) {
        return { valid: false, reason: "Only null is supported" };
      }
      return { valid: true };
    default:
      return { valid: true };
  }
}
