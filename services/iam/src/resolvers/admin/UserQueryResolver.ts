import { ZodResolver } from "@shopana/type-resolver";
import { IAMType } from "./IAMType.js";
import { UserResolver } from "./UserResolver.js";
import type { Domain, Resource } from "../../casbin/CasbinService.js";
import type { AuthorizeInput } from "./generated/types.js";
import { AuthorizeInputSchema } from "./generated/schemas.js";

/**
 * UserQuery namespace resolver.
 * Handles all user-related queries.
 */
export class UserQueryResolver extends IAMType<Record<string, never>> {
  /**
   * Get current authenticated user.
   */
  current() {
    if (!this.ctx.currentUser) {
      return null;
    }
    return new UserResolver(this.ctx.currentUser.id, this.ctx);
  }

  /**
   * Check if current user has permission for resource:action.
   * Named 'checkPermission' in GraphQL schema as 'authorize'.
   *
   * Authorization hierarchy:
   * 1. Owner bypass: Organization owner has implicit access to everything in the org
   * 2. RBAC check: Falls back to Casbin for role-based access
   */
  @ZodResolver(AuthorizeInputSchema())
  // TODO: Use script
  async authorize(args: { input: AuthorizeInput }) {
    const { input } = args;
    const { currentUser, kernel } = this.ctx;

    if (!currentUser?.id) {
      return {
        allowed: false,
        reason: "Not authenticated",
      };
    }

    // Owner bypass: Organization owner has full access to everything in the org
    const isOwner = await kernel.repository.organization.isOwner(
      input.organizationId,
      currentUser.id
    );

    if (isOwner) {
      return {
        allowed: true,
        reason: null,
      };
    }

    // Fall back to RBAC check
    const allowed = await kernel.repository.casbin.enforce({
      subject: currentUser.id,
      organizationId: input.organizationId,
      domain: input.domain as Domain,
      resource: input.resource as Resource,
      action: input.action,
    });

    return {
      allowed,
      reason: allowed ? null : "Permission denied",
    };
  }
}
