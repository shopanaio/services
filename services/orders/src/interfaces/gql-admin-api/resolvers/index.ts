import { scalarResolvers } from "./scalars";
import { GlobalIdEntity, decodeGlobalIdByType, parseGlobalId } from "@shopana/shared-graphql-guid";
import { MutationResolver } from "../../../resolvers/admin/MutationResolver.js";
import { OrderResolver } from "../../../resolvers/admin/OrderResolver.js";
import { QueryResolver } from "../../../resolvers/admin/QueryResolver.js";
import type { GraphQLContext } from "../context.js";

export const resolvers = {
  ...scalarResolvers,
  Query: QueryResolver,
  Mutation: MutationResolver,
  Order: {
    __resolveReference(reference: { id: string }, context: GraphQLContext) {
      return new OrderResolver(decodeGlobalIdByType(reference.id, GlobalIdEntity.Order), context);
    },
  },
  Node: {
    __resolveType(value: { id?: unknown }) {
      if (typeof value.id !== "string") return null;
      try {
        return parseGlobalId(value.id).typeName;
      } catch {
        return null;
      }
    },
  },
  DisplayableError: { __resolveType: () => "OrderUserError" },
  Connection: {
    __resolveType(value: { edges?: readonly unknown[] }) {
      const node = (value.edges?.[0] as { node?: { id?: string } } | undefined)?.node;
      if (!node?.id) return "OrderConnection";
      try {
        return `${parseGlobalId(node.id).typeName}Connection`;
      } catch {
        return "OrderConnection";
      }
    },
  },
};

export default resolvers;
