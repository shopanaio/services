import { z } from "zod";
import type { inventory as Inventory } from "@shopana/plugin-sdk";
import { inventory } from "@shopana/plugin-sdk";
import { gqlRequest } from "@shopana/platform-api";
import { gql } from "graphql-request";
import { configSchema } from "./index";

type Config = z.infer<typeof configSchema>;

/**
 * Product variant data type from Core Apps GraphQL API
 */
interface CoreVariant {
  id: string;
  price: number;
  oldPrice?: number | null;
  stockStatus: "IN_STOCK" | "OUT_OF_STOCK";
  title: string;
  sku?: string | null;
  cover?: {
    url: string;
    id: string;
  } | null;
  product?: {
    productType?: {
      isPhysical?: boolean;
    };
  };
}

/**
 * Response from Core Apps GraphQL API
 */
interface CoreVariantsResponse {
  variants: CoreVariant[];
}

/**
 * Shopana provider for fetching inventory offers via Core Apps GraphQL API
 */
export class ShopanaInventoryProvider implements Inventory.InventoryProvider {
  constructor(
    private readonly ctx: Inventory.ProviderContext,
    private readonly cfg: Config
  ) {}

  inventory = {
    getOffers: async (
      input: Inventory.GetOffersInput
    ): Promise<Inventory.InventoryOffer[]> => {
      return this.getOffersImpl(input);
    },
  };

  private async getOffersImpl(
    input: Inventory.GetOffersInput
  ): Promise<Inventory.InventoryOffer[]> {
    if (!input.items.length) {
      return [];
    }

    // If mock mode is enabled, return test data
    if (this.cfg.mockMode) {
      return this.getMockOffers(input);
    }

    try {
      // Extract variant IDs for the request
      const variantIds = input.items.map((item) => item.purchasableId);

      // GraphQL query to fetch variant data
      const query = gql`
        query Variants($ids: [ID!]!) {
          variants(ids: $ids) {
            id
            price
            oldPrice
            stockStatus
            title
            sku
            cover {
              url
            }
          }
        }
      `;

      // Execute request to Core Apps GraphQL API
      const coreAppsGraphqlUrl =
        process.env.CORE_APPS_GRAPHQL_URL || "http://localhost:4000/graphql";
      const data = await gqlRequest<CoreVariantsResponse>(
        { getCoreAppsGraphqlUrl: () => coreAppsGraphqlUrl },
        query,
        { ids: variantIds },
        {
          "x-api-key": input.apiKey!,
          "x-currency": input.currency!,
        }
      );

      // Create map for fast variant lookup by ID
      const variantById = new Map<string, CoreVariant>(
        (data.variants ?? []).map((v) => [v.id, v])
      );

      // Transform data to InventoryOffer format
      const offers: Inventory.InventoryOffer[] = input.items
        .map(({ purchasableId, lineId, quantity }) => {
          const variant = variantById.get(purchasableId);

          if (!variant) {
            this.ctx.logger.warn("Variant not found", { purchasableId });
            return null;
          }

          const isAvailable = variant.stockStatus !== "OUT_OF_STOCK";

          // Determine payment mode based on product status
          const paymentMode =
            variant.stockStatus === "IN_STOCK"
              ? inventory.PaymentMode.IMMEDIATE
              : inventory.PaymentMode.DEFERRED;

          // Consider product physical by default for safety
          const isPhysical = variant.product?.productType?.isPhysical ?? true;

          // Create product data snapshot
          const purchasableSnapshot: Inventory.PurchasableSnapshot = {
            title: variant.title,
            sku: variant.sku || null,
            imageUrl: variant.cover?.url || null,
            data: {
              variantId: variant.id,
              stockStatus: variant.stockStatus,
              coverId: variant.cover?.id || null,
            },
          };

          const offer: Inventory.InventoryOffer = {
            purchasableId,
            unitPrice: variant.price,
            unitCompareAtPrice: variant.oldPrice || null,
            isAvailable,
            isPhysical,
            paymentMode,
            purchasableSnapshot,
            providerPayload: {
              provider: "shopana",
              lineId,
              quantity,
              stockStatus: variant.stockStatus,
              requestedAt: new Date().toISOString(),
            },
          };

          return offer;
        })
        .filter((offer): offer is Inventory.InventoryOffer => offer !== null);

      this.ctx.logger.info("Successfully retrieved inventory offers", {
        requestedCount: input.items.length,
        returnedCount: offers.length,
      });

      return offers;
    } catch (error) {
      this.ctx.logger.error("Failed to get inventory offers from Shopana", {
        error: error instanceof Error ? error.message : String(error),
        itemsCount: input.items.length,
      });

      // Return empty array in case of error
      // In a real application, could throw error or return fallback data
      return [];
    }
  }

  /**
   * Returns test data for mock mode
   */
  private getMockOffers(
    input: Inventory.GetOffersInput
  ): Inventory.InventoryOffer[] {
    this.ctx.logger.info("Returning mock inventory offers");

    return input.items.map(({ purchasableId, lineId, quantity }) => ({
      purchasableId,
      unitPrice: 1000, // $10.00 in minor units
      unitCompareAtPrice: 1500, // $15.00 in minor units
      isAvailable: true,
      isPhysical: true,
      paymentMode: inventory.PaymentMode.IMMEDIATE,
      purchasableSnapshot: {
        title: `Mock Product ${purchasableId}`,
        sku: `MOCK-${purchasableId}`,
        imageUrl: null,
        data: {
          mockMode: true,
        },
      },
      providerPayload: {
        provider: "shopana",
        mode: "mock",
        lineId,
        quantity,
        requestedAt: new Date().toISOString(),
      },
    }));
  }
}
