import { BaseScript } from "../../kernel/BaseScript.js";
import type { AuthorizeParams, AuthorizeResult } from "./dto/AuthorizeDto.js";

export class AuthorizeScript extends BaseScript<AuthorizeParams, AuthorizeResult> {
  protected async execute(params: AuthorizeParams): Promise<AuthorizeResult> {
    const { userId, organizationId, domain, resource, action } = params;

    // Check permission using Casbin RBAC
    const allowed = await this.repository.casbin.enforce({
      organizationId,
      userId,
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
