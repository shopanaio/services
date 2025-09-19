import type { TransactionScript } from "@src/kernel/types";
import type {
  InventoryOffer,
  GetOffersInput,
} from "@shopana/inventory-plugin-sdk";

/**
 * Parameters for transaction script getOffers
 */
export interface GetOffersParams extends GetOffersInput {
  projectId: string;
  requestId: string;
  userAgent?: string;
}

/**
 * Result of getOffers execution
 */
export interface GetOffersResult {
  offers: InventoryOffer[];
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
  const { logger, pluginManager } = services;

  try {
    // List of plugins in priority order
    const pluginCodes = ["shopana"]; // In the future, it can be obtained from configuration
    const warnings: Array<{ code: string; message: string }> = [];

    // Try each plugin in sequence
    for (const pluginCode of pluginCodes) {
      try {
        const offers = await pluginManager.getOffers({
          pluginCode,
          input: {
            items: params.items,
            currency: params.currency,
            locale: params.locale,
            apiKey: params.apiKey,
          },
        });

        logger.info(
          {
            pluginCode,
            offersCount: offers.length,
            itemsRequested: params.items?.length || 0,
            projectId: params.projectId,
          },
          "Successfully retrieved offers from plugin"
        );

        return {
          offers,
          warnings: warnings.length > 0 ? warnings : undefined,
        } satisfies GetOffersResult;
      } catch (pluginError) {
        logger.warn(
          {
            pluginCode,
            error:
              pluginError instanceof Error
                ? pluginError.message
                : String(pluginError),
            projectId: params.projectId,
          },
          "Plugin failed, trying next plugin"
        );

        warnings.push({
          code: "PLUGIN_ERROR",
          message: `Plugin ${pluginCode} failed: ${pluginError instanceof Error ? pluginError.message : String(pluginError)}`,
        });
      }
    }

    // If all plugins failed, return fallback
    logger.error(
      {
        pluginCodes,
        projectId: params.projectId,
      },
      "All plugins failed, returning empty result"
    );

    return {
      offers: [],
      warnings: [
        ...warnings,
        {
          code: "ALL_PLUGINS_FAILED",
          message: "All inventory plugins failed to provide offers",
        },
      ],
      fallbackSource: "empty",
    };
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
