import { GraphQLScalarType, Kind, type ValueNode } from "graphql";

export const dateTimeScalar = new GraphQLScalarType({
  name: "DateTime",
  description: "An RFC 3339 date-time serialized in UTC.",
  serialize: (value) => toIsoDateTime(value),
  parseValue: (value) => toIsoDateTime(value),
  parseLiteral: (node) => parseDateTimeLiteral(node),
});

function parseDateTimeLiteral(node: ValueNode): string {
  if (node.kind !== Kind.STRING) {
    throw new TypeError("DateTime must be provided as a string");
  }
  return toIsoDateTime(node.value);
}

function toIsoDateTime(value: unknown): string {
  if (!(value instanceof Date) && typeof value !== "string") {
    throw new TypeError("DateTime must be a Date or date-time string");
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("DateTime must be a valid date-time");
  }
  return date.toISOString();
}
