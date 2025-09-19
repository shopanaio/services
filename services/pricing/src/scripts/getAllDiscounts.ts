import type {
  KernelServices,
  TransactionScript,
} from "@src/kernel/types";
import type { Discount } from "@shopana/pricing-plugin-kit";
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
  const { projectId, requestId, userAgent } = params;
  const { pluginManager, broker, logger } = services;

  try {
    // 1. Get project slots
    const slotsResult = await broker.call("apps.getSlots", {
      projectId,
      domain: "pricing",
    });
    const slots = slotsResult.slots;


    // 2. If no slots - emergency fallback
    if (!slots || slots.length === 0) {
      logger.warn({ projectId }, "No pricing slots configured for project");
      const fb = buildEmergencyFallback();
      return { discounts: [], warnings: fb.warnings };
    }

    // 3. Results aggregation WITHOUT MAPPING
    const allDiscounts: Discount[] = [];
    const warnings: Array<{ code: string; message: string }> = [];

    // 4. Get discounts for each slot - plugins already return Discount
    for (const slot of slots) {
      const discounts = await pluginManager.getDiscounts({
        pluginCode: slot.provider,
        rawConfig: (slot.data as Record<string, unknown>) ?? {},
        projectId,
        requestMeta: { requestId, userAgent },
      });

      // 5. Just add them - no mapping!
      allDiscounts.push(...discounts);
    }

    return {
      discounts: allDiscounts,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      discounts: [],
      warnings: [{ code: "INTERNAL_ERROR", message: "Internal server error" }],
    };
  }
};
