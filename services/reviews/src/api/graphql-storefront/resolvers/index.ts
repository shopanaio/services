import { MutationResolver } from "../../../resolvers/storefront/MutationResolver.js";
import { QueryResolver } from "../../../resolvers/storefront/QueryResolver.js";
import { typeResolvers } from "./types.js";

export const resolvers = { Query: QueryResolver, Mutation: MutationResolver, ...typeResolvers };
