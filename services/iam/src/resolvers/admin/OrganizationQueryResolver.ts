import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { IAMType } from "./IAMType.js";
import { OrganizationResolver } from "./OrganizationResolver.js";
import {
  OrganizationConnectionResolver,
  type OrganizationConnectionResolverInput,
} from "./OrganizationConnectionResolver.js";

/**
 * Input args for the organizations query from GraphQL
 */
interface OrganizationsQueryArgs {
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
  where?: OrganizationConnectionResolverInput["where"];
  orderBy?: Array<{ field: string; direction: "asc" | "desc" }> | null;
}

/**
 * OrganizationQuery namespace resolver.
 * Handles all organization-related queries.
 */
export class OrganizationQueryResolver extends IAMType<Record<string, never>> {
  /**
   * Get organization by ID.
   */
  organization(args: { id: string }) {
    const id = decodeGlobalIdByType(args.id, GlobalIdEntity.Organization);
    return new OrganizationResolver(id, this.$ctx);
  }

  /**
   * Get all organizations the current user has access to with cursor pagination.
   * Returns empty connection if user is not authenticated.
   */
  organizations(args: OrganizationsQueryArgs) {
    const { currentUser } = this.$ctx;

    // Transform orderBy from GraphQL format to relay format
    const orderBy = args.orderBy?.map((o) => ({
      field: o.field as "name" | "displayName" | "createdAt" | "updatedAt",
      direction: o.direction,
    }));

    const input: OrganizationConnectionResolverInput = {
      // Use empty string for unauthenticated users - repository will return empty results
      userId: currentUser?.id ?? "",
      first: args.first ?? undefined,
      after: args.after ?? undefined,
      last: args.last ?? undefined,
      before: args.before ?? undefined,
      where: args.where ?? undefined,
      orderBy: orderBy ?? undefined,
    };

    return new OrganizationConnectionResolver(input, this.$ctx);
  }
}
