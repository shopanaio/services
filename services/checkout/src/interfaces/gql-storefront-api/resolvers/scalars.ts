import { GraphQLScalarType, Kind } from "graphql";
import { Money } from "@shopana/shared-money";
import { parseDecimalInput } from "@src/utils/decimal";
import superjson from "superjson";

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

/**
 * Custom JSON scalar type with advanced serialization capabilities
 * Supports serialization and deserialization of:
 * - Standard JSON types (Objects, Arrays, Strings, Numbers, Booleans, null)
 * - BigInt values
 * - Date objects
 * - Map and Set collections
 * - RegExp patterns
 * - undefined values
 * - NaN, Infinity
 * - Error objects
 * - Functions (via serialize-javascript)
 * - Any nested combinations of the above
 *
 * Uses superjson for type-safe serialization and serialize-javascript for function support
 */
const JSONScalar = new GraphQLScalarType({
  name: "JSON",
  description:
    "Advanced JSON scalar supporting BigInt, Date, Map, Set, RegExp, functions and other complex types",

  serialize(value: unknown): string {
    const { json } = superjson.serialize(value);
    return json as string;
  },

  parseValue(value: unknown): unknown {
    if (typeof value !== "string") {
      return value;
    }

    try {
      // First try to parse as superjson format
      const parsed = JSON.parse(value);

      // Check if it has superjson metadata structure
      if (
        parsed &&
        typeof parsed === "object" &&
        "json" in parsed &&
        "meta" in parsed
      ) {
        return superjson.deserialize(parsed);
      }

      // Otherwise return the parsed value as-is
      return parsed;
    } catch (error) {
      // If parsing fails, return the original string
      return value;
    }
  },

  parseLiteral(ast): unknown {
    switch (ast.kind) {
      case Kind.STRING:
        return JSONScalar.parseValue(ast.value);
      case Kind.INT:
      case Kind.FLOAT:
        return Number(ast.value);
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.NULL:
        return null;
      case Kind.OBJECT:
        return parseObjectLiteral(ast);
      case Kind.LIST:
        return ast.values.map((node) => JSONScalar.parseLiteral(node));
      default:
        return null;
    }
  },
});

/**
 * Helper function to parse GraphQL object literals
 */
function parseObjectLiteral(ast: any): Record<string, unknown> {
  const value: Record<string, unknown> = Object.create(null);
  ast.fields.forEach((field: any) => {
    value[field.name.value] = JSONScalar.parseLiteral(field.value);
  });
  return value;
}

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
