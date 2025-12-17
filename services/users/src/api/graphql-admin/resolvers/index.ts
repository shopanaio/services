import { queryResolvers } from "./queries.js";
import { userMutationResolvers } from "./mutations/user.js";

export const resolvers = {
  ...queryResolvers,
  ...userMutationResolvers,
};
