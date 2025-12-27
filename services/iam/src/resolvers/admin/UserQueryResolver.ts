import { IAMType } from "./IAMType.js";
import { UserResolver } from "./UserResolver.js";
import type { Domain, Resource } from "../../casbin/CasbinService.js";

interface CheckPermissionInput {
  organizationId: string;
  domain: string;
  resource: string;
  action: string;
}

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
   */
  async checkPermission(args: { input: CheckPermissionInput }) {
    const { input } = args;
    const { currentUser, kernel } = this.ctx;

    if (!currentUser?.id) {
      return {
        allowed: false,
        reason: "Not authenticated",
      };
    }

    const allowed = await kernel.repository.casbin.enforce({
      userId: currentUser.id,
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
