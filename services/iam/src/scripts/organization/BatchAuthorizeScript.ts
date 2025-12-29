import { ORG_DOMAIN } from "@src/casbin/CasbinService.js";
import { BaseScript, ZodSchema } from "../../kernel/BaseScript.js";
import {
  batchAuthorizeInputSchema,
  type BatchAuthorizeParams,
  type BatchAuthorizeResult,
} from "./dto/BatchAuthorizeDto.js";

export class BatchAuthorizeScript extends BaseScript<
  BatchAuthorizeParams,
  BatchAuthorizeResult
> {
  @ZodSchema(batchAuthorizeInputSchema)
  protected async execute(
    params: BatchAuthorizeParams
  ): Promise<BatchAuthorizeResult> {
    const { organizationId, requests } = params;

    const results = await this.repository.casbin.batchEnforce({
      organizationId,
      requests: requests.map((req) => ({
        subject: req.userId,
        domain: req.domain ?? ORG_DOMAIN,
        resource: req.resource,
        action: req.action,
      })),
    });

    return { results };
  }

  protected handleError(_error: unknown): BatchAuthorizeResult {
    return { results: [] };
  }
}
