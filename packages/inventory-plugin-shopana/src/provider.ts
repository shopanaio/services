import { z } from "zod";
import type { inventory as Inventory } from "@shopana/plugin-sdk";
import { inventory } from "@shopana/plugin-sdk";
import { gqlRequest } from "@shopana/platform-api";
import { gql } from "graphql-request";
import { configSchema } from "./index";

type Config = z.infer<typeof configSchema>;

/**
 * Maps ProductGroupPriceType from GraphQL to ChildPriceType
 */
function mapPriceType(
  priceType: string
): Inventory.ChildPriceType {
  switch (priceType) {
    case "FREE":
      return "FREE";
    case "BASE":
      return "BASE";
    case "BASE_ADJUST_AMOUNT":
      return "DISCOUNT_AMOUNT";
    case "BASE_ADJUST_PERCENT":
      return "DISCOUNT_PERCENT";
    case "BASE_OVERRIDE":
      return "OVERRIDE";
    default:
      return "BASE";
  }
}

/**
 * Applies price configuration to calculate the final price
 * @param originalPrice - Original price in minor units
 * @param config - Price configuration to apply
 * @returns Final price in minor units (never negative)
 */
function applyPriceConfig(
  originalPrice: number,
  config: Inventory.ChildPriceConfigInput
): number {
  switch (config.type) {
    case "FREE":
      return 0;

    case "BASE":
      return originalPrice;

    case "DISCOUNT_AMOUNT":
      return Math.max(0, originalPrice - (config.amount ?? 0));

    case "DISCOUNT_PERCENT": {
      const percent = config.percent ?? 0;
      return Math.max(0, Math.floor((originalPrice * (100 - percent)) / 100));
    }

    case "MARKUP_AMOUNT":
      return originalPrice + (config.amount ?? 0);

    case "MARKUP_PERCENT": {
      const percent = config.percent ?? 0;
      return Math.floor((originalPrice * (100 + percent)) / 100);
    }

    case "OVERRIDE":
      return config.amount ?? originalPrice;

    default:
      return originalPrice;
  }
}

/**
 * Product group item from GraphQL
 */
interface CoreProductGroupItem {
  id: string;
  variant: {
    id: string;
    price: number;
    oldPrice?: number | null;
    stockStatus: string;
    title: string;
    sku?: string | null;
    cover?: { url: string; id: string } | null;
  };
  sortIndex: number;
  priceType: string;
  priceAmountValue?: number | null;
  pricePercentageValue?: number | null;
  maxQuantity?: number | null;
}

/**
 * Product group from GraphQL
 */
interface CoreProductGroup {
  id: string;
  title: string;
  items: CoreProductGroupItem[];
  isRequired: boolean;
  isMultiple: boolean;
  sortIndex: number;
}

/**
 * Product variant data type from Core Apps GraphQL API
 */
interface CoreVariant {
  id: string;
  price: number;
  oldPrice?: number | null;
  stockStatus: string;
  title: string;
  sku?: string | null;
  cover?: {
    url: string;
    id: string;
  } | null;
  product?: {
    id: string;
    groups: CoreProductGroup[];
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
      // Check if any items have children - need to fetch groups
      const hasChildren = input.items.some(
        (item) => item.children && item.children.length > 0
      );

      // Collect all variant IDs (parents + children)
      const allVariantIds = new Set<string>();
      for (const item of input.items) {
        allVariantIds.add(item.purchasableId);
        if (item.children) {
          for (const child of item.children) {
            allVariantIds.add(child.purchasableId);
          }
        }
      }

      // GraphQL query - include groups if we have children
      const query = hasChildren
        ? gql`
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
                  id
                }
                product {
                  id
                  groups {
                    id
                    title
                    isRequired
                    isMultiple
                    sortIndex
                    items {
                      id
                      variant {
                        id
                        price
                        oldPrice
                        stockStatus
                        title
                        sku
                        cover {
                          url
                          id
                        }
                      }
                      sortIndex
                      priceType
                      priceAmountValue
                      pricePercentageValue
                      maxQuantity
                    }
                  }
                }
              }
            }
          `
        : gql`
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
                  id
                }
              }
            }
          `;

      // Execute request to Core Apps GraphQL API
      const coreAppsGraphqlUrl = process.env.PLATFORM_INVENTORY_GRAPHQL_URL;
      if (!coreAppsGraphqlUrl) {
        throw new Error("PLATFORM_INVENTORY_GRAPHQL_URL is not set");
      }

      const data = await gqlRequest<CoreVariantsResponse>(
        { getCoreAppsGraphqlUrl: () => coreAppsGraphqlUrl },
        query,
        { ids: Array.from(allVariantIds) },
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
        .map((item) => {
          const { purchasableId, lineId, quantity } = item;
          const variant = variantById.get(purchasableId);

          if (!variant) {
            this.ctx.logger.warn("Variant not found", { purchasableId });
            return null;
          }

          // Build base offer for parent
          const parentOffer = this.buildOffer(variant, lineId, quantity);

          // Process children if present
          if (item.children && item.children.length > 0) {
            const childOffers = this.processChildren(
              item.children,
              variant,
              variantById
            );
            return {
              ...parentOffer,
              children: childOffers,
            };
          }

          return parentOffer;
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
      return [];
    }
  }

  /**
   * Build a single offer from variant data
   */
  private buildOffer(
    variant: CoreVariant | CoreProductGroupItem["variant"],
    lineId: string,
    quantity: number,
    priceConfig?: Inventory.ChildPriceConfigInput,
    groupInfo?: {
      groupId: string;
      groupItemId: string;
      maxQuantity?: number;
    }
  ): Inventory.InventoryOffer {
    const isAvailable = variant.stockStatus !== "OUT_OF_STOCK";
    const paymentMode =
      variant.stockStatus === "IN_STOCK"
        ? inventory.PaymentMode.IMMEDIATE
        : inventory.PaymentMode.DEFERRED;

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

    const originalPrice = variant.price;
    const finalPrice = priceConfig
      ? applyPriceConfig(originalPrice, priceConfig)
      : originalPrice;

    // Check maxQuantity validation
    let validationError: string | undefined;
    if (groupInfo?.maxQuantity && quantity > groupInfo.maxQuantity) {
      validationError = `Quantity ${quantity} exceeds max allowed ${groupInfo.maxQuantity}`;
    }

    return {
      purchasableId: variant.id,
      unitPrice: finalPrice,
      unitOriginalPrice: originalPrice,
      unitCompareAtPrice: variant.oldPrice || null,
      isAvailable,
      isPhysical: true,
      paymentMode,
      purchasableSnapshot,
      providerPayload: {
        provider: "shopana",
        lineId,
        quantity,
        stockStatus: variant.stockStatus,
        requestedAt: new Date().toISOString(),
      },
      appliedPriceConfig: priceConfig,
      groupId: groupInfo?.groupId,
      groupItemId: groupInfo?.groupItemId,
      maxQuantity: groupInfo?.maxQuantity,
      validationError,
    };
  }

  /**
   * Process children items - validate against groups and apply price config from DB
   */
  private processChildren(
    children: ReadonlyArray<Inventory.GetOffersChildInput>,
    parentVariant: CoreVariant,
    variantById: Map<string, CoreVariant>
  ): Inventory.InventoryOffer[] {
    const groups = parentVariant.product?.groups ?? [];

    // DEBUG: Log groups and parent info
    this.ctx.logger.info("processChildren called", {
      parentId: parentVariant.id,
      groupsCount: groups.length,
      childrenCount: children.length,
      groups: groups.map((g) => ({
        id: g.id,
        title: g.title,
        itemsCount: g.items.length,
        variantIds: g.items.map((it) => it.variant.id),
      })),
      childrenPurchasableIds: children.map((c) => c.purchasableId),
    });

    // Build map: childVariantId -> ProductGroupItem
    const groupItemByVariantId = new Map<string, {
      groupId: string;
      item: CoreProductGroupItem;
    }>();

    for (const group of groups) {
      for (const item of group.items) {
        groupItemByVariantId.set(item.variant.id, {
          groupId: group.id,
          item,
        });
      }
    }

    return children.map((child) => {
      const { purchasableId, lineId, quantity } = child;

      // Find child in parent's groups
      const groupData = groupItemByVariantId.get(purchasableId);

      if (!groupData) {
        // Child not found in any group - validation error
        this.ctx.logger.warn("Child variant not found in parent groups", {
          childId: purchasableId,
          parentId: parentVariant.id,
        });

        // Return validation error regardless of whether variant exists
        // The variant must be in parent's ProductGroup to be added as a child
        return {
          purchasableId,
          unitPrice: 0,
          unitOriginalPrice: 0,
          isAvailable: false,
          isPhysical: true,
          paymentMode: inventory.PaymentMode.IMMEDIATE,
          validationError: `Variant ${purchasableId} not found in parent product groups`,
        };
      }

      // Get price config from ProductGroupItem
      const { groupId, item } = groupData;
      const priceConfig: Inventory.ChildPriceConfigInput = {
        type: mapPriceType(item.priceType),
        amount: item.priceAmountValue ?? undefined,
        percent: item.pricePercentageValue ?? undefined,
      };

      // Use variant data from group item (already fetched with groups)
      return this.buildOffer(
        item.variant,
        lineId,
        quantity,
        priceConfig,
        {
          groupId,
          groupItemId: item.id,
          maxQuantity: item.maxQuantity ?? undefined,
        }
      );
    });
  }

  /**
   * Returns test data for mock mode
   */
  private getMockOffers(
    input: Inventory.GetOffersInput
  ): Inventory.InventoryOffer[] {
    this.ctx.logger.info("Returning mock inventory offers");

    return input.items.map((item) => {
      const { purchasableId, lineId, quantity, children } = item;
      const originalPrice = 1000; // $10.00 in minor units

      const baseOffer: Inventory.InventoryOffer = {
        purchasableId,
        unitPrice: originalPrice,
        unitOriginalPrice: originalPrice,
        unitCompareAtPrice: 1500,
        isAvailable: true,
        isPhysical: true,
        paymentMode: inventory.PaymentMode.IMMEDIATE,
        purchasableSnapshot: {
          title: `Mock Product ${purchasableId}`,
          sku: `MOCK-${purchasableId}`,
          imageUrl: null,
          data: { mockMode: true },
        },
        providerPayload: {
          provider: "shopana",
          mode: "mock",
          lineId,
          quantity,
          requestedAt: new Date().toISOString(),
        },
      };

      // Process mock children
      if (children && children.length > 0) {
        const childOffers = children.map((child, index) => {
          const childPrice = 500; // $5.00
          const mockPriceConfig: Inventory.ChildPriceConfigInput = {
            type: index === 0 ? "FREE" : "DISCOUNT_PERCENT",
            percent: index === 0 ? undefined : 10,
          };
          const finalPrice = applyPriceConfig(childPrice, mockPriceConfig);

          return {
            purchasableId: child.purchasableId,
            unitPrice: finalPrice,
            unitOriginalPrice: childPrice,
            isAvailable: true,
            isPhysical: true,
            paymentMode: inventory.PaymentMode.IMMEDIATE,
            purchasableSnapshot: {
              title: `Mock Child ${child.purchasableId}`,
              sku: `MOCK-CHILD-${child.purchasableId}`,
              imageUrl: null,
              data: { mockMode: true },
            },
            providerPayload: {
              provider: "shopana",
              mode: "mock",
              lineId: child.lineId,
              quantity: child.quantity,
            },
            appliedPriceConfig: mockPriceConfig,
            groupId: "mock-group-1",
            groupItemId: `mock-item-${index}`,
            maxQuantity: 5,
          };
        });

        return {
          ...baseOffer,
          children: childOffers,
        };
      }

      return baseOffer;
    });
  }
}
