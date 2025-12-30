import { QueryResolver } from "../../../resolvers/admin/QueryResolver.js";
import { MutationResolver } from "../../../resolvers/admin/MutationResolver.js";
import { ProductResolver } from "../../../resolvers/admin/ProductResolver.js";
import { VariantResolver } from "../../../resolvers/admin/VariantResolver.js";
import { WarehouseResolver } from "../../../resolvers/admin/WarehouseResolver.js";
import { typeResolvers } from "./types.js";

/**
 * GraphQL resolvers for the inventory service.
 *
 * Uses class-based resolvers with decorators:
 * - @ApolloQuery/@ApolloMutation for root resolvers (return Proxy objects)
 * - @SubgraphReference for type resolvers with federation support
 *
 * The decorators handle conversion from class to Apollo-compatible resolver format.
 */
export const resolvers = {
  // Root resolvers - decorated with @ApolloQuery/@ApolloMutation
  // They return Proxy objects that handle Apollo resolver signature
  Query: QueryResolver as any,
  Mutation: MutationResolver as any,

  // Type resolvers with @SubgraphReference decorator
  Product: ProductResolver as any,
  Variant: VariantResolver as any,
  Warehouse: WarehouseResolver as any,

  // Type resolvers for scalars, interfaces, and federation references
  ...typeResolvers,
};
