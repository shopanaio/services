import { ORG_DOMAIN } from "@src/casbin/CasbinService.js";
import { validateAuthorizeInput } from "@shopana/rbac";
import { BaseScript, ZodSchema } from "../../kernel/BaseScript.js";
import {
  batchAuthorizeInputSchema,
  type BatchAuthorizeParams,
  type BatchAuthorizeResult,
} from "./dto/BatchAuthorizeDto.js";

export class BatchAuthorizeScript extends BaseScript<BatchAuthorizeParams, BatchAuthorizeResult> {
  @ZodSchema(batchAuthorizeInputSchema)
  protected async execute(params: BatchAuthorizeParams): Promise<BatchAuthorizeResult> {
    const { organizationId, requests } = params;

    const validRequests = requests.flatMap((request, index) => {
      const domain = request.domain ?? ORG_DOMAIN;
      const validation = validateAuthorizeInput({
        domain,
        resource: request.resource,
        action: request.action,
      });
      if (!validation.success) return [];
      return [{ index, request, domain }];
    });

    const results = Array.from({ length: requests.length }, () => false);
    if (validRequests.length === 0) return { results };

    const [adminUserIds, owner, casbinResults] = await Promise.all([
      this.repository.user.findAdminUserIds(validRequests.map(({ request }) => request.userId)),
      this.repository.organization.findOwner(organizationId),
      this.repository.casbin.batchEnforce({
        organizationId,
        requests: validRequests.map(({ request, domain }) => ({
          subject: request.userId,
          domain,
          resource: request.resource,
          action: request.action,
        })),
      }),
    ]);

    const admins = new Set(adminUserIds);
    validRequests.forEach(({ index, request }, validIndex) => {
      const baseAllowed =
        admins.has(request.userId) ||
        owner?.userId === request.userId ||
        Boolean(casbinResults[validIndex]);
      results[index] = baseAllowed;
    });

    return { results };
  }

  protected handleError(_error: unknown): BatchAuthorizeResult {
    return { results: [] };
  }
}
