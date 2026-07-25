import type { TransactionScript } from "@shopana/shared-kernel";
import type { ShippingMethod } from "@shopana/shared-service-api";
import { transformMethodCodes } from "../utils/transformMethods";

// Parameters for getting all shipping methods
export interface GetShippingMethodsParams {
  readonly storeId: string;
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
  const { storeId } = params;
  const { broker, logger } = services;

  try {
    const result = await broker.call("apps.executeCapability", {
      storeId,
      capability: "shipping",
      operation: "list",
      input: { storeId },
    }) as { data?: unknown };

    const methods = (result.data as ShippingMethod[]) || [];

    if (methods.length === 0) {
      logger.warn({ storeId }, "No shipping methods returned");
    }

    // Return result with transformed codes
    return {
      methods: transformMethodCodes(methods),
    };
  } catch (error) {
    logger.error({ error }, "shippingMethods failed");
    return {
      methods: [],
      warnings: [{ code: "INTERNAL_ERROR", message: "Internal server error" }],
    };
  }
};
