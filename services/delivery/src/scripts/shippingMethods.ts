import type { TransactionScript } from "@shopana/shared-kernel";
import type { ShippingMethod } from "@shopana/plugin-sdk/shipping";
import { transformMethodCodes } from "../utils/transformMethods";
import { Domain } from "@shopana/plugin-sdk";

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
  const { projectId } = params;
  const { broker, logger } = services;

  try {
    // Execute apps.execute to get shipping methods via centralized plugin manager
    const result = await broker.call("apps.execute", {
      domain: Domain.SHIPPING,
      operation: "list",
      params: { projectId },
    });

    const methods = result.data as ShippingMethod[] || [];
    const warnings = result.warnings || [];

    if (methods.length === 0) {
      logger.warn({ projectId }, "No shipping methods returned");
    }

    // Return result with transformed codes
    return {
      methods: transformMethodCodes(methods),
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    logger.error({ error }, "shippingMethods failed");
    return {
      methods: [],
      warnings: [{ code: "INTERNAL_ERROR", message: "Internal server error" }],
    };
  }
};
