import { queries } from "./queries.js";
import { mutations } from "./mutations/index.js";

export const resolvers = {
  Query: queries,
  Mutation: mutations,
};
