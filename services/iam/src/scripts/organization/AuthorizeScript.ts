import { BaseScript } from "../../kernel/BaseScript.js";
import { Authorizable } from "../../kernel/Authorizable.js";
import type { AuthorizeParams, AuthorizeResult } from "./dto/AuthorizeDto.js";

/**
 * Authorization script that creates a custom Authorizable for the target user.
 * Supports both organizationId and organizationName (resolved via NameResolver).
 */
export class AuthorizeScript extends BaseScript<
  AuthorizeParams,
  AuthorizeResult
> {
  protected async execute(params: AuthorizeParams): Promise<AuthorizeResult> {
    const { userId, organizationId, organizationName, domain, resource, action } = params;

    // Create Authorizable for the target user (not current user)
    const targetAuth = new Authorizable(userId);

    // Use authorize method (handles admin check, name resolution, casbin)
    const allowed = await targetAuth.authorize({
      organizationId,
      organizationName,
      domain,
      resource,
      action,
    });

    return {
      allowed,
      deniedReason: allowed
        ? undefined
        : `User lacks ${action} permission on ${resource}`,
    };
  }

  protected handleError(error: unknown): AuthorizeResult {
    return {
      allowed: false,
      deniedReason:
        error instanceof Error ? error.message : "Authorization check failed",
    };
  }
}
