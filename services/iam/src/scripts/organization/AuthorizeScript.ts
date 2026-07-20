import { BaseScript } from "../../kernel/BaseScript.js";
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
    } = params;

    // Use authorize method (handles admin check, name resolution, casbin)
    const allowed = await this.authProvider.authorize({
      organizationId,
      organizationName,
      domain,
      resource,
      action,
      subject,
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
