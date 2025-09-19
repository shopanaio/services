import type { TransactionScript } from "@src/kernel/types";
import type { ShippingMethod } from "@shopana/shipping-plugin-kit";
import { transformMethodCodes } from "../utils/transformMethods";

// Parameters for getting all shipping methods
export interface GetShippingMethodsParams {
  readonly projectId: string;
  readonly requestId?: string;
  readonly userAgent?: string;
}

// Execution result
export interface GetShippingMethodsResult {
  methods: ShippingMethod[];
  warnings?: Array<{ code: string; message: string }>;
}

/**
 * Transaction Script: Getting all available shipping methods for the project
 */
export const shippingMethods: TransactionScript<
  GetShippingMethodsParams,
  GetShippingMethodsResult
> = async (params, services) => {
  const { projectId, requestId, userAgent } = params;
  const { pluginManager, broker, logger } = services;

  try {
    // 1. Get project slots
    const slotsResult = await broker.call("apps.getSlots", {
      projectId,
      domain: "shipping",
    });
    const slots = slotsResult.slots;
    console.log("slots", slots);

    // 2. If no slots - emergency fallback
    if (!slots || slots.length === 0) {
      logger.warn({ projectId }, "No shipping slots configured for project");
      return { methods: [], warnings: [] };
    }

    // 3. Results aggregation WITHOUT MAPPING
    const allMethods: ShippingMethod[] = [];
    const warnings: Array<{ code: string; message: string }> = [];

    // 4. Get methods for each slot - plugins already return ShippingMethod
    for (const slot of slots) {
      const methods = await pluginManager.getMethods({
        pluginCode: slot.provider,
        rawConfig: (slot.data as Record<string, unknown>) ?? {},
        projectId,
        requestMeta: { requestId, userAgent },
      });

      // 5. Just add them - no mapping!
      allMethods.push(...methods);
    }

    // 6. Return result with transformed codes
    return {
      methods: transformMethodCodes(allMethods),
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    // 7. Error handling
    console.log("\n\nerror", error);
    return {
      methods: [],
      warnings: [{ code: "INTERNAL_ERROR", message: "Internal server error" }],
    };
  }
};
