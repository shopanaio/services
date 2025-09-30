import type { TransactionScript } from "@shopana/shared-kernel";
import type { inventory as Inventory } from "@shopana/plugin-sdk";

/**
 * Parameters for transaction script getOffers
 */
export interface GetOffersParams extends Inventory.GetOffersInput {
  projectId: string;
  requestId: string;
  userAgent?: string;
}

/**
 * Result of getOffers execution
 */
export interface GetOffersResult {
  offers: Inventory.InventoryOffer[];
  warnings?: Array<{ code: string; message: string }>;
  fallbackSource?: string;
}

/**
 * Transaction Script: Getting inventory offers
 *
 * Main business logic for getting offers through plugins
 */
export const getOffers: TransactionScript<
  GetOffersParams,
  GetOffersResult
> = async (params, services) => {
  const { logger, broker } = services;

  try {
    // Delegate to `apps.execute` for domain inventory
    const { data, warnings } = await broker.call("apps.execute", {
      domain: "inventory",
      operation: "getOffers",
      params,
    });

    return { offers: data as Inventory.InventoryOffer[], warnings, fallbackSource: undefined };
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        projectId: params.projectId,
      },
      "Critical error in getOffers transaction script"
    );

    // In case of critical error, return empty result
    return {
      offers: [],
      warnings: [
        {
          code: "CRITICAL_ERROR",
          message: "Critical error occurred while retrieving inventory offers",
        },
      ],
      fallbackSource: "error",
    };
  }
};
