import { GraphQLScalarType, Kind, type ValueNode } from "graphql";

export const typeResolvers = {
  DateTime: new GraphQLScalarType({
    name: "DateTime",
    serialize: (value) => (value instanceof Date ? value.toISOString() : String(value)),
    parseValue: (value) => String(value),
  }),
  JSON: new GraphQLScalarType({
    name: "JSON",
    serialize: (value) => value,
    parseValue: (value) => value,
    parseLiteral: (node) => parseLiteral(node),
  }),
  Node: {
    __resolveType: () => "AuditEntry",
  },
};

function parseLiteral(node: ValueNode): unknown {
  switch (node.kind) {
    case Kind.STRING:
    case Kind.ENUM:
      return node.value;
    case Kind.INT:
      return Number.parseInt(node.value, 10);
    case Kind.FLOAT:
      return Number.parseFloat(node.value);
    case Kind.BOOLEAN:
      return node.value;
    case Kind.NULL:
      return null;
    case Kind.LIST:
      return node.values.map((value) => parseLiteral(value));
    case Kind.OBJECT:
      return Object.fromEntries(
        node.fields.map((field) => [field.name.value, parseLiteral(field.value)]),
      );
    default:
      return undefined;
  }
}
