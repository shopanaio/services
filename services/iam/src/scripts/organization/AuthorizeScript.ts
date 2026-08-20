import { BaseScript } from "../../kernel/BaseScript.js";
import type { AuthorizeParams, AuthorizeResult } from "./dto/AuthorizeDto.js";
import { ORG_DOMAIN } from "../../casbin/CasbinService.js";
import { validateAuthorizeInput, type ValidatedAuthorizeInput } from "@shopana/rbac";

/**
 * Authorization against current IAM state without request context or ALS.
 * This makes the action safe to call while DBOS is recovering a workflow.
 */
export class AuthorizeScript extends BaseScript<AuthorizeParams, AuthorizeResult> {
  protected async execute(params: AuthorizeParams): Promise<AuthorizeResult> {
    if (!params.subject) return this.denied(params);

    const organizationId = await this.resolveOrganizationId(params);
    if (!organizationId) return this.denied(params);

    const authorization = this.validateAuthorization(params);
    if (!authorization) return this.denied(params);

    const allowed = await this.hasAccess(params.subject, organizationId, authorization);
    return allowed ? { allowed: true } : this.denied(params);
  }

  protected handleError(_error: unknown): AuthorizeResult {
    return {
      allowed: false,
      deniedReason: "Authorization check failed",
    };
  }

  private async resolveOrganizationId(params: AuthorizeParams): Promise<string | null> {
    if (!params.organizationName) {
      return params.organizationId ?? null;
    }

    const organizationIdFromName = await this.services.nameResolver.resolveOrganizationId(
      params.organizationName,
      async (name) => (await this.repository.organization.findByName(name))?.id ?? null,
    );
    if (!organizationIdFromName) return null;

    if (params.organizationId && params.organizationId !== organizationIdFromName) {
      return null;
    }

    return organizationIdFromName;
  }

  private validateAuthorization(params: AuthorizeParams): ValidatedAuthorizeInput | null {
    const result = validateAuthorizeInput({
      domain: params.domain ?? ORG_DOMAIN,
      resource: params.resource,
      action: params.action,
    });
    return result.success ? result.data : null;
  }

  private async hasAccess(
    subject: string,
    organizationId: string,
    authorization: ValidatedAuthorizeInput,
  ): Promise<boolean> {
    const [siteAdminUserIds, owner, casbinAllowed] = await Promise.all([
      this.repository.user.findAdminUserIds([subject]),
      this.repository.organization.findOwner(organizationId),
      this.repository.casbin.enforce({
        organizationId,
        subject,
        domain: authorization.domain,
        resource: authorization.resource,
        action: authorization.action,
      }),
    ]);

    return siteAdminUserIds.includes(subject) || owner?.userId === subject || casbinAllowed;
  }

  private denied(params: AuthorizeParams): AuthorizeResult {
    return {
      allowed: false,
      deniedReason: `User lacks ${params.action} permission on ${params.resource}`,
    };
  }
}
