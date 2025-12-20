import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { GraphQLResolveInfo } from "graphql";
import type { ServiceContext } from "../../../context/index.js";
import { UserResolver } from "../../../resolvers/admin/UserResolver.js";
import type { Resolvers, User } from "../generated/types.js";

/**
 * Resolves user using UserResolver
 * @param userId - The Casdoor user id (sub field from JWT)
 */
export async function resolveUser(
  userId: string,
  ctx: ServiceContext,
  info: GraphQLResolveInfo,
  fieldPath?: string
): Promise<User | null> {
  const fieldInfo = fieldPath ? parseGraphqlInfo(info, fieldPath) : parseGraphqlInfo(info);
  return UserResolver.load(userId, fieldInfo, ctx) as Promise<User | null>;
}

export const typeResolvers: Partial<Resolvers> = {
  // UserError interface resolver
  UserError: {
    __resolveType: () => "GenericUserError",
  },
};
