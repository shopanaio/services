import type { TransactionScript } from "@shopana/kernel";
import type { Discount } from "@shopana/plugin-sdk/pricing";
import { buildEmergencyFallback } from "./fallback";

// Parameters for getting all discounts
export interface GetAllDiscountsParams {
  readonly projectId: string;
  readonly requestId?: string;
  readonly userAgent?: string;
}

// Execution result
export interface GetAllDiscountsResult {
  discounts: Discount[];
  warnings?: Array<{ code: string; message: string }>;
}

/**
 * Transaction Script: Getting all available discounts for the project
 */
export const getAllDiscounts: TransactionScript<
  GetAllDiscountsParams,
  GetAllDiscountsResult
> = async (params, services) => {
  const { projectId } = params;
  const { broker, logger } = services;

  try {
    // Execute apps.execute to get discounts via centralized plugin manager
    const result = await broker.call("apps.execute", {
      domain: "pricing",
      operation: "list",
      params: { projectId },
    });

    const discounts = result.data as Discount[] || [];
    const warnings = result.warnings || [];

    if (discounts.length === 0) {
      logger.warn({ projectId }, "No discounts returned");
    }

    return {
      discounts,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    logger.error({ error }, "getAllDiscounts failed");
    return {
      discounts: [],
      warnings: [{ code: "INTERNAL_ERROR", message: "Internal server error" }],
    };
  }
};
