import { ZodResolver } from "@shopana/type-resolver";
import { IAMType } from "./IAMType.js";
import { UserResolver } from "./UserResolver.js";
import { AuthorizeScript } from "../../scripts/organization/AuthorizeScript.js";
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
  async authorize(args: { input: AuthorizeInput }) {
    const { input } = args;
    const { currentUser, kernel } = this.ctx;

    if (!currentUser?.id) {
      return {
        allowed: false,
        reason: "Not authenticated",
      };
    }

    const result = await kernel.runScript(AuthorizeScript, {
      subject: currentUser.id,
      organizationId: input.organizationId,
      domain: input.domain,
      resource: input.resource,
      action: input.action,
    });

    return {
      allowed: result.allowed,
      reason: result.deniedReason ?? null,
    };
  }
}
