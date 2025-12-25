import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { GraphQLResolveInfo } from "graphql";
import type { ServiceContext } from "../../../context/index.js";
import { UserResolver } from "../../../resolvers/admin/UserResolver.js";
import { OrganizationResolver } from "../../../resolvers/admin/OrganizationResolver.js";
import type { Resolvers, User, Organization } from "../generated/types.js";

/**
 * Resolves user using UserResolver
 * @param userId - The user id (from better-auth)
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

/**
 * Resolves organization using OrganizationResolver
 * @param organizationId - The organization id
 */
export async function resolveOrganization(
  organizationId: string,
  ctx: ServiceContext,
  info: GraphQLResolveInfo,
  fieldPath?: string
): Promise<Organization | null> {
  const fieldInfo = fieldPath ? parseGraphqlInfo(info, fieldPath) : parseGraphqlInfo(info);
  return OrganizationResolver.load(organizationId, fieldInfo, ctx) as Promise<Organization | null>;
}

export const typeResolvers: Partial<Resolvers> = {
  // UserError interface resolver
  UserError: {
    __resolveType: () => "GenericUserError",
  },
};
