import { BaseScript } from "../../kernel/BaseScript.js";
import type { BatchAuthorizeParams, BatchAuthorizeResult } from "./dto/index.js";

/**
 * BatchAuthorize - Check multiple authorizations in one call
 *
 * TENANT ISOLATION:
 * Uses organizationId (project slug) for isolated authorization checks.
 *
 * Implementation:
 * 1. Use organizationId directly (passed from caller)
 * 2. Check cache for each request
 * 3. For cache misses → call Casbin batchEnforce() via CasbinService
 * 4. Cache results, return
 */
export class BatchAuthorizeScript extends BaseScript<
  BatchAuthorizeParams,
  BatchAuthorizeResult
> {
  protected async execute(
    params: BatchAuthorizeParams
  ): Promise<BatchAuthorizeResult> {
    const { userId, organizationId, requests } = params;

    if (requests.length === 0) {
      return {
        results: [],
        userErrors: [],
      };
    }

    // TODO: Add caching layer
    // For now, go directly to Casbin

    try {
      const allowedResults = await this.repository.authorization.batchEnforce(
        organizationId,
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
