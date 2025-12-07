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
  $like: "like",
  $iLike: "iLike",
  $notLike: "notLike",
  $notILike: "notILike",
  $is: "is",
  $isNot: "isNot",
} as const;

export type OperatorKey = keyof typeof OPERATORS;

/**
 * Check if a key is an operator (starts with $)
 */
export function isOperator(key: string): key is OperatorKey {
  return key.startsWith("$") && key in OPERATORS;
}

/**
 * Check if a key is a logical operator ($and, $or)
 */
export function isLogicalOperator(key: string): key is "$and" | "$or" {
  return key === "$and" || key === "$or";
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

  switch (op) {
    case "eq":
      return eq(column, value);

    case "neq":
    case "noteq":
      return ne(column, value);

    case "gt":
      return gt(column, value);

    case "gte":
      return gte(column, value);

    case "lt":
      return lt(column, value);

    case "lte":
      return lte(column, value);

    case "in":
      if (Array.isArray(value) && value.length > 0) {
        return inArray(column, value);
      }
      return null;

    case "notin":
    case "nin":
      if (Array.isArray(value) && value.length > 0) {
        return notInArray(column, value);
      }
      return null;

    case "like":
      if (typeof value === "string") {
        return like(column, value);
      }
      return null;

    case "ilike":
      if (typeof value === "string") {
        return ilike(column, value);
      }
      return null;

    case "notlike":
    case "nlike":
      if (typeof value === "string") {
        return notLike(column, value);
      }
      return null;

    case "notilike":
    case "nilike":
      if (typeof value === "string") {
        return notIlike(column, value);
      }
      return null;

    case "is":
      // $is: null -> IS NULL
      if (value === null) {
        return isNull(column);
      }
      return null;

    case "isnot":
      // $isNot: null -> IS NOT NULL
      if (value === null) {
        return isNotNull(column);
      }
      return null;

    default:
      return null;
  }
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
