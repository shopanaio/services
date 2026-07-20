import { BaseScript } from "../../kernel/BaseScript.js";
import { ServiceLinkedResourceAuthorizationError } from "@shopana/rbac";
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
    const {
      subject,
      organizationId,
      organizationName,
      domain,
      resource,
      action,
      protectedResource,
    } = params;

    // Use authorize method (handles admin check, name resolution, casbin)
    const allowed = await this.authProvider.authorize({
      organizationId,
      organizationName,
      domain,
      resource,
      action,
      subject,
      protectedResource,
    });

    return {
      allowed,
      deniedReason: allowed
        ? undefined
        : `User lacks ${action} permission on ${resource}`,
    };
  }

  protected handleError(error: unknown): AuthorizeResult {
    if (error instanceof ServiceLinkedResourceAuthorizationError) {
      return {
        allowed: false,
        deniedReason: error.message,
        deniedCode: error.code,
        serviceLinkedDetails: error.details,
      };
    }

    return {
      allowed: false,
      deniedReason:
        error instanceof Error ? error.message : "Authorization check failed",
    };
  }
}
