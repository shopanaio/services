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

    // Apply ORG_DOMAIN default to requests without domain
    const normalizedRequests = requests.map((req) => ({
      ...req,
      domain: req.domain ?? ORG_DOMAIN,
    }));

    const results = await this.repository.casbin.batchAuthorize({
      organizationId,
      requests: normalizedRequests,
    });

    return { results };
  }

  protected handleError(_error: unknown): BatchAuthorizeResult {
    return { results: [] };
  }
}
