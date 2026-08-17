import { GraphQLScalarType, Kind, type ValueNode } from "graphql";

export function createIsoDateTimeScalar(name: string): GraphQLScalarType {
  return new GraphQLScalarType({
    name,
    description: "An RFC 3339 date-time serialized in UTC.",
    serialize: (value) => toIsoDateTime(value, name),
    parseValue: (value) => toIsoDateTime(value, name),
    parseLiteral: (node) => parseDateTimeLiteral(node, name),
  });
}

function parseDateTimeLiteral(node: ValueNode, name: string): string {
  if (node.kind !== Kind.STRING) {
    throw new TypeError(`${name} must be provided as a string`);
  }
  return toIsoDateTime(node.value, name);
}

function toIsoDateTime(value: unknown, name: string): string {
  if (!(value instanceof Date) && typeof value !== "string") {
    throw new TypeError(`${name} must be a Date or date-time string`);
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`${name} must be a valid date-time`);
  }
  return date.toISOString();
}
