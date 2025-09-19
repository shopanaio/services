import { GraphQLScalarType, Kind } from "graphql";
import { Money } from "@shopana/shared-money";
import { parseDecimalInput } from "@src/utils/decimal";

const BigIntScalar = new GraphQLScalarType({
  name: "BigInt",
  serialize(value) {
    if (typeof value === "bigint") return Number(value);
    if (typeof value === "number") return Math.trunc(value);
    if (typeof value === "string") return Number(value);
    return null;
  },
  parseValue(value) {
    if (value == null) return null;
    return Number(value as any);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.INT || ast.kind === Kind.STRING) {
      return Number(ast.value);
    }
    return null;
  },
});

const JSONScalar = new GraphQLScalarType({
  name: "JSON",
  serialize(value) {
    return value as any;
  },
  parseValue(value) {
    return value as any;
  },
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.INT:
      case Kind.FLOAT:
      case Kind.BOOLEAN:
      case Kind.OBJECT:
      case Kind.LIST:
        return (ast as any).value ?? null;
      default:
        return null;
    }
  },
});

const DecimalScalar = new GraphQLScalarType({
  name: "Decimal",
  description:
    "Decimal represented as integer amount and scale internally; serialized as normalized string",
  serialize(value: unknown): string | null {
    // If we were passed Money already - use its conversion
    if (value instanceof Money) {
      return value.toRoundedUnit();
    }
    throw new Error("Invalid value for Decimal");
  },
  parseValue(value) {
    const parsed = parseDecimalInput(value);
    if (!parsed) return null;
    const amount = BigInt(parsed.amount);
    return Money.fromMinor(amount, "USD");
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING || ast.kind === Kind.INT) {
      const parsed = parseDecimalInput(ast.value);
      if (!parsed) return null;
      const amount = BigInt(parsed.amount);
      return Money.fromMinor(amount, "USD");
    }
    return null;
  },
});

const StringLikeScalar = (name: string) =>
  new GraphQLScalarType({
    name,
    serialize(value) {
      if (value == null) return null as any;
      return String(value);
    },
    parseValue(value) {
      if (value == null) return null as any;
      return String(value);
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING || ast.kind === Kind.INT) {
        return String(ast.value);
      }
      return null as any;
    },
  });

const DateTimeScalar = StringLikeScalar("DateTime");
const CursorScalar = StringLikeScalar("Cursor");
const UuidScalar = StringLikeScalar("Uuid");
const CurrencyCodeScalar = StringLikeScalar("CurrencyCode");
const CountryCodeScalar = StringLikeScalar("CountryCode");
const EmailScalar = StringLikeScalar("Email");

export const scalarResolvers = {
  BigInt: BigIntScalar,
  JSON: JSONScalar,
  Decimal: DecimalScalar,
  DateTime: DateTimeScalar,
  Cursor: CursorScalar,
  Uuid: UuidScalar,
  CurrencyCode: CurrencyCodeScalar,
  CountryCode: CountryCodeScalar,
  Email: EmailScalar,
};
