import { QueryResolver } from "../../../resolvers/admin/QueryResolver.js";
import { typeResolvers } from "./types.js";

export const resolvers = {
  Query: QueryResolver,
  ...typeResolvers,
};
