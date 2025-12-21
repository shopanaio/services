import { BaseScript } from "../../kernel/BaseScript.js";
import type { BatchAuthorizeParams, BatchAuthorizeResult } from "./dto/index.js";

/**
 * BatchAuthorize - Check multiple authorizations in one call
 *
 * TENANT ISOLATION:
 * Uses tenantId (Casdoor organization name from integrations) for isolated authorization checks.
 *
 * Implementation:
 * 1. Use tenantId directly (passed from caller)
 * 2. Check Redis cache for each request
 * 3. For cache misses → call Casdoor batchEnforce() API
 * 4. Cache results, return
 */
export class BatchAuthorizeScript extends BaseScript<
  BatchAuthorizeParams,
  BatchAuthorizeResult
> {
  protected async execute(
    params: BatchAuthorizeParams
  ): Promise<BatchAuthorizeResult> {
    const { userId, tenantId, requests } = params;

    if (requests.length === 0) {
      return {
        results: [],
        userErrors: [],
      };
    }

    // TODO: Add caching layer (Phase 1.6)
    // For now, go directly to Casdoor

    try {
      const allowedResults = await this.repository.authorization.batchEnforce(
        tenantId,
        userId,
        requests
      );

      const results = requests.map((req, index) => ({
        allowed: allowedResults[index] ?? false,
        deniedReason: allowedResults[index]
          ? undefined
          : `Access denied to ${req.resource}:${req.action}`,
      }));

      return {
        results,
        userErrors: [],
      };
    } catch (error) {
      this.logger.error(
        { error, params },
        "BatchAuthorizeScript: Failed to check authorization"
      );

      // Fail-closed: deny access on error
      return {
        results: requests.map((req) => ({
          allowed: false,
          deniedReason: "Authorization service unavailable",
        })),
        userErrors: [],
      };
    }
  }

  protected handleError(_error: unknown): BatchAuthorizeResult {
    // Fail-closed: deny access on error
    return {
      results: [],
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred during batch authorization",
        },
      ],
    };
  }
}
