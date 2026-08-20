import { Money } from "@shopana/shared-money";
import { parseDecimalInput } from "@src/utils/decimal";
import { GraphQLScalarType, Kind, type ObjectValueNode, type ValueNode } from "graphql";
import type { ApiResolvers } from "../types";

function serializeBigInt(value: unknown): string {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (typeof value === "string" && /^-?\d+$/.test(value)) return value;
  throw new TypeError("BigInt must be an integer serialized without precision loss");
}

const BigIntScalar = new GraphQLScalarType<string, string>({
  name: "BigInt",
  description: "An arbitrary-size integer serialized as a decimal string.",
  serialize: serializeBigInt,
  parseValue: serializeBigInt,
  parseLiteral(ast) {
    if (ast.kind === Kind.INT || ast.kind === Kind.STRING) return serializeBigInt(ast.value);
    throw new TypeError("BigInt must be provided as an integer or decimal string");
  },
});

function normalizeDecimal(value: unknown): string {
  if (value instanceof Money) return value.toRoundedUnit();
  const parsed = parseDecimalInput(value);
  if (!parsed) throw new TypeError("Decimal must be a finite decimal string");

  const negative = parsed.amount.startsWith("-");
  const digits = negative ? parsed.amount.slice(1) : parsed.amount;
  if (parsed.scale === 0) return parsed.amount;

  const padded = digits.padStart(parsed.scale + 1, "0");
  const integer = padded.slice(0, -parsed.scale);
  const fraction = padded.slice(-parsed.scale);
  return `${negative ? "-" : ""}${integer}.${fraction}`;
}

const DecimalScalar = new GraphQLScalarType<string, string>({
  name: "Decimal",
  description: "An arbitrary-precision signed decimal serialized as a string.",
  serialize: normalizeDecimal,
  parseValue: normalizeDecimal,
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING || ast.kind === Kind.INT || ast.kind === Kind.FLOAT) {
      return normalizeDecimal(ast.value);
    }
    throw new TypeError("Decimal must be provided as a decimal string or number");
  },
});

function parseJsonLiteral(ast: ValueNode): unknown {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.ENUM:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return Number(ast.value);
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.NULL:
      return null;
    case Kind.OBJECT:
      return parseJsonObject(ast);
    case Kind.LIST:
      return ast.values.map(parseJsonLiteral);
    case Kind.VARIABLE:
      throw new TypeError("Variables are resolved before JSON literal parsing");
  }
}

function parseJsonObject(ast: ObjectValueNode): Record<string, unknown> {
  return Object.fromEntries(
    ast.fields.map((field) => [field.name.value, parseJsonLiteral(field.value)]),
  );
}

const JSONScalar = new GraphQLScalarType<unknown, unknown>({
  name: "JSON",
  description: "A JSON-serializable value with secrets excluded.",
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral: parseJsonLiteral,
});

function stringScalar(name: "DateTime" | "Email" | "URL"): GraphQLScalarType<string, string> {
  const parse = (value: unknown): string => {
    if (typeof value !== "string") throw new TypeError(`${name} must be a string`);
    return value;
  };

  return new GraphQLScalarType<string, string>({
    name,
    serialize: parse,
    parseValue: parse,
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) return ast.value;
      throw new TypeError(`${name} must be provided as a string`);
    },
  });
}

export const scalarResolvers = {
  BigInt: BigIntScalar,
  DateTime: stringScalar("DateTime"),
  Decimal: DecimalScalar,
  Email: stringScalar("Email"),
  JSON: JSONScalar,
  URL: stringScalar("URL"),
} satisfies Pick<ApiResolvers, "BigInt" | "DateTime" | "Decimal" | "Email" | "JSON" | "URL">;
