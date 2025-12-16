import { userMutationResolvers } from "./mutations/user.js";
import { customerMutationResolvers } from "./mutations/customer.js";
import { authMutationResolvers } from "./mutations/auth.js";

/**
 * Merge multiple resolver objects into one
 */
function mergeResolvers<T extends Record<string, unknown>>(...resolversList: T[]): T {
  const merged: Record<string, unknown> = {};

  for (const resolvers of resolversList) {
    for (const [key, value] of Object.entries(resolvers)) {
      if (typeof value === "object" && value !== null) {
        merged[key] = { ...(merged[key] as object || {}), ...value };
      } else {
        merged[key] = value;
      }
    }
  }

  return merged as T;
}

export const resolvers = mergeResolvers(
  userMutationResolvers,
  customerMutationResolvers,
  authMutationResolvers
);
