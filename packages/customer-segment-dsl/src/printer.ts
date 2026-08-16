import { encodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type {
  SegmentExpression,
  SegmentFunctionParameter,
  SegmentPredicateOperator,
  SegmentValue,
} from "./types.js";

const OPERATOR_TEXT: Record<SegmentPredicateOperator, string> = {
  eq: "=",
  neq: "!=",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  between: "BETWEEN",
  in: "IN",
  not_in: "NOT IN",
  is_null: "IS NULL",
  is_not_null: "IS NOT NULL",
  contains: "CONTAINS",
  not_contains: "NOT CONTAINS",
};

export function printSegmentQuery(root: SegmentExpression): string {
  return printExpression(root, 0);
}

function printExpression(expression: SegmentExpression, parentPrecedence: number): string {
  const precedence = expressionPrecedence(expression);
  let output: string;
  if (expression.kind === "logical") {
    output = expression.children
      .map((child) => printExpression(child, precedence))
      .join(expression.operator === "and" ? " AND " : " OR ");
  } else if (expression.kind === "not") {
    output = `NOT ${printExpression(expression.child, precedence)}`;
  } else if (expression.kind === "function") {
    if (expression.operator === "is_null" || expression.operator === "is_not_null") {
      output = `${expression.name} ${OPERATOR_TEXT[expression.operator]}`;
    } else {
      const parameters = expression.parameters.map(printParameter).join(", ");
      output = `${expression.name} ${expression.operator === "matches" ? "MATCHES" : "NOT_MATCHES"} (${parameters})`;
    }
  } else if (expression.operator === "is_null" || expression.operator === "is_not_null") {
    output = `${expression.attribute} ${OPERATOR_TEXT[expression.operator]}`;
  } else if (expression.operator === "between") {
    output = `${expression.attribute} BETWEEN ${printValue(expression.value)} AND ${printValue(expression.upperValue)}`;
  } else if (expression.operator === "in" || expression.operator === "not_in") {
    output = `${expression.attribute} ${OPERATOR_TEXT[expression.operator]} (${expression.values.map(printValue).join(", ")})`;
  } else {
    output = `${expression.attribute} ${OPERATOR_TEXT[expression.operator]} ${printValue(expression.value)}`;
  }
  return precedence < parentPrecedence ? `(${output})` : output;
}

function printParameter(parameter: SegmentFunctionParameter): string {
  if (parameter.operator === "is_null" || parameter.operator === "is_not_null") {
    return `${parameter.name} ${OPERATOR_TEXT[parameter.operator]}`;
  }
  if (parameter.operator === "between") {
    return `${parameter.name} BETWEEN ${printValue(parameter.value)} AND ${printValue(parameter.upperValue)}`;
  }
  if (parameter.operator === "in" || parameter.operator === "not_in") {
    return `${parameter.name} ${OPERATOR_TEXT[parameter.operator]} (${parameter.values.map(printValue).join(", ")})`;
  }
  return `${parameter.name} ${OPERATOR_TEXT[parameter.operator]} ${printValue(parameter.value)}`;
}

function printValue(value: SegmentValue): string {
  switch (value.kind) {
    case "string":
      return quote(value.value);
    case "enum":
      return quote(value.value.toUpperCase());
    case "boolean":
      return value.value ? "TRUE" : "FALSE";
    case "integer":
    case "decimal":
      return value.value;
    case "money":
      return formatMoney(value.minor, value.currencyExponent);
    case "date":
    case "dateTime":
      return value.value;
    case "namedDate":
      return value.value;
    case "relativeDate": {
      const suffix = { day: "d", week: "w", month: "m", year: "y" }[value.unit];
      return `${value.amount >= 0 ? "+" : ""}${value.amount}${suffix}`;
    }
    case "entityId": {
      const entity = (GlobalIdEntity as Record<string, GlobalIdEntity>)[value.entity];
      if (!entity) throw new Error(`Unknown Global ID entity ${value.entity}`);
      return quote(encodeGlobalIdByType(value.id, entity));
    }
  }
}

function quote(value: string): string {
  return `'${value
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")
    .replaceAll("\t", "\\t")}'`;
}

function formatMoney(minor: string, exponent: number): string {
  const negative = minor.startsWith("-");
  const digits = negative ? minor.slice(1) : minor;
  if (exponent === 0) return `${negative ? "-" : ""}${digits}`;
  const padded = digits.padStart(exponent + 1, "0");
  const split = padded.length - exponent;
  return `${negative ? "-" : ""}${padded.slice(0, split)}.${padded.slice(split)}`;
}

function expressionPrecedence(expression: SegmentExpression): number {
  if (expression.kind === "logical") return expression.operator === "and" ? 2 : 1;
  if (expression.kind === "not") return 3;
  return 4;
}
