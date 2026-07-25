import { MutationResolver } from "../../../resolvers/admin/MutationResolver.js";
import { QueryResolver } from "../../../resolvers/admin/QueryResolver.js";

export const resolvers = {
  Query: QueryResolver,
  Mutation: MutationResolver,
};
