import { ORG_DOMAIN } from "@src/casbin/CasbinService.js";
import { getBrokerCallContext } from "@shopana/shared-kernel";
import { validateAuthorizeInput } from "@shopana/rbac";
import { BaseScript, ZodSchema } from "../../kernel/BaseScript.js";
import {
  batchAuthorizeInputSchema,
  type BatchAuthorizeParams,
  type BatchAuthorizeResult,
} from "./dto/BatchAuthorizeDto.js";
import {
  isIamServiceLinkedPermission,
  isServiceLinkedWriteAction,
} from "../../service-linked/resources.js";

export class BatchAuthorizeScript extends BaseScript<
  BatchAuthorizeParams,
  BatchAuthorizeResult
> {
  @ZodSchema(batchAuthorizeInputSchema)
  protected async execute(
    params: BatchAuthorizeParams
  ): Promise<BatchAuthorizeResult> {
    const { organizationId, requests } = params;

    const validRequests = requests.flatMap((request, index) => {
      const domain = request.domain ?? ORG_DOMAIN;
      if (
        request.protectedResource &&
        request.protectedResource.organizationId !== organizationId
      ) {
        return [];
      }
      const validation = validateAuthorizeInput({
        domain,
        resource: request.resource,
        action: request.action,
      });
      if (!validation.success) return [];
      return [{ index, request, domain }];
    });

    const results = new Array<boolean>(requests.length).fill(false);
    if (validRequests.length === 0) return { results };

    const protectedResources = validRequests.flatMap(({ request }) =>
      request.protectedResource ? [request.protectedResource] : []
    );
    const [adminUserIds, owner, casbinResults, bindings] = await Promise.all([
      this.repository.user.findAdminUserIds(
        validRequests.map(({ request }) => request.userId)
      ),
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
      this.repository.serviceLinkedResource.findActiveByResources(
        protectedResources
      ),
    ]);

    const admins = new Set(adminUserIds);
    const bindingsByResource = new Map(
      bindings.map((binding) => [resourceKey(binding), binding])
    );
    const caller = getBrokerCallContext()?.caller;

    validRequests.forEach(({ index, request }, validIndex) => {
      const baseAllowed =
        admins.has(request.userId) ||
        owner?.userId === request.userId ||
        Boolean(casbinResults[validIndex]);
      const binding = request.protectedResource
        ? bindingsByResource.get(resourceKey(request.protectedResource))
        : undefined;
      if (binding && isServiceLinkedWriteAction(request.action)) {
        results[index] =
          caller?.service === binding.linkedService &&
          isIamServiceLinkedPermission(
            binding.resourceKind,
            request.resource,
            request.action
          );
        return;
      }
      results[index] = baseAllowed;
    });

    return { results };
  }

  protected handleError(_error: unknown): BatchAuthorizeResult {
    return { results: [] };
  }
}

function resourceKey(resource: {
  organizationId: string;
  resourceKind: string;
  resourceId: string;
}): string {
  return `${resource.organizationId}:${resource.resourceKind}:${resource.resourceId}`;
}
