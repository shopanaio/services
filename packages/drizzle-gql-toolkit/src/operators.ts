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
  $like: "like",
  $iLike: "iLike",
  $notLike: "notLike",
  $notILike: "notILike",
  $is: "is",
  $isNot: "isNot",
} as const;

export type OperatorKey = keyof typeof OPERATORS;

type OperatorHandler = (column: Column, value: unknown) => SQL | null;

const OPERATOR_HANDLERS: Record<string, OperatorHandler> = {
  eq: (column, value) => eq(column, value),
  neq: (column, value) => ne(column, value),
  noteq: (column, value) => ne(column, value),
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
  nin: (column, value) => {
    if (!Array.isArray(value)) {
      return null;
    }
    if (value.length === 0) {
      return sql`TRUE`;
    }
    return notInArray(column, value);
  },
  like: (column, value) =>
    typeof value === "string" ? like(column, value) : null,
  ilike: (column, value) =>
    typeof value === "string" ? ilike(column, value) : null,
  notlike: (column, value) =>
    typeof value === "string" ? notLike(column, value) : null,
  nlike: (column, value) =>
    typeof value === "string" ? notLike(column, value) : null,
  notilike: (column, value) =>
    typeof value === "string" ? notIlike(column, value) : null,
  nilike: (column, value) =>
    typeof value === "string" ? notIlike(column, value) : null,
  is: (column, value) => (value === null ? isNull(column) : null),
  isnot: (column, value) => (value === null ? isNotNull(column) : null),
} as const;

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
    case "like":
    case "ilike":
    case "notlike":
    case "nlike":
    case "notilike":
    case "nilike":
      if (typeof value !== "string") {
        return { valid: false, reason: "Expected string value" };
      }
      if (value.length > 1000) {
        return { valid: false, reason: "Pattern is too long" };
      }
      return { valid: true };
    case "in":
    case "notin":
    case "nin":
      if (!Array.isArray(value)) {
        return { valid: false, reason: "Expected array value" };
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
