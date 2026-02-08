import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { GraphQLResolveInfo } from "graphql";
import type { ServiceContext } from "../../../context/index.js";
import { UserResolver } from "../../../resolvers/admin/UserResolver.js";
import { OrganizationResolver } from "../../../resolvers/admin/OrganizationResolver.js";
import { MembershipResolver } from "../../../resolvers/admin/MembershipResolver.js";
import {
  MemberResolver,
  type MemberInput,
} from "../../../resolvers/admin/MemberResolver.js";
import type { Domain } from "../../../casbin/CasbinService.js";
import type {
  Resolvers,
  User,
  Organization,
  Membership,
  Member,
} from "../../../resolvers/admin/generated/types.js";

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
  const fieldInfo = fieldPath
    ? parseGraphqlInfo(info, fieldPath)
    : parseGraphqlInfo(info);
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
  const fieldInfo = fieldPath
    ? parseGraphqlInfo(info, fieldPath)
    : parseGraphqlInfo(info);
  return OrganizationResolver.load(
    organizationId,
    fieldInfo,
    ctx
  ) as Promise<Organization | null>;
}

/**
 * Resolves membership using MembershipResolver
 * @param domain - The domain identifier ("org" for organization, or "store:{id}")
 * @param organizationId - The organization ID
 */
export async function resolveMembership(
  domain: Domain,
  organizationId: string,
  ctx: ServiceContext,
  info: GraphQLResolveInfo,
  fieldPath?: string
): Promise<Membership | null> {
  const fieldInfo = fieldPath
    ? parseGraphqlInfo(info, fieldPath)
    : parseGraphqlInfo(info);
  return MembershipResolver.load(
    { domain, organizationId },
    fieldInfo,
    ctx
  ) as Promise<Membership | null>;
}

/**
 * Resolves member using MemberResolver
 * @param input - Member input with userId, role, domain, organizationId
 */
export async function resolveMember(
  input: MemberInput,
  ctx: ServiceContext,
  info: GraphQLResolveInfo,
  fieldPath?: string
): Promise<Member | null> {
  const fieldInfo = fieldPath
    ? parseGraphqlInfo(info, fieldPath)
    : parseGraphqlInfo(info);
  return MemberResolver.load(input, fieldInfo, ctx) as Promise<Member | null>;
}

export const typeResolvers: Partial<Resolvers> = {
  // UserError interface resolver
  UserError: {
    __resolveType: () => "GenericUserError",
  },

  // Membership federation reference resolver
  Membership: {
    __resolveReference: async (
      reference: { __typename: "Membership"; domain: string; organizationId: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      return MembershipResolver.load(
        {
          domain: reference.domain as Domain,
          organizationId: reference.organizationId,
        },
        fieldInfo,
        ctx
      );
    },
  },

  // Role federation reference resolver
  // Note: Role uses composite key (organizationId, domain, name) internally,
  // but federation @key is just "id". Role resolver needs to be updated
  // to support loading by ID for federation to work.
  Role: {
    __resolveReference: async (_reference, _ctx, _info) => {
      // TODO: Implement role loading by ID for federation
      // The RoleResolver currently requires {organizationId, domain, name}
      // but federation only provides {id}
      throw new Error("Role federation reference resolver not implemented");
    },
  },
};
