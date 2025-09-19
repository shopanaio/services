import { InventoryOffer, GetOffersInput } from "@shopana/inventory-plugin-sdk";

/**
 * Response for get offers endpoint
 */
export type GetOffersResponse = Readonly<{
  offers: InventoryOffer[];
  warnings?: Array<{ code: string; message: string }>;
}>;

/**
 * High-level client interface for the inventory service.
 */
export interface InventoryApiClient {
  /**
   * Get inventory offers for specified items
   * @param input - Items to get offers for with correlation context
   * @returns Array of inventory offers
   */
  getOffers(
    input: GetOffersInput & {
      projectId: string;
      apiKey: string;
    }
  ): Promise<InventoryOffer[]>;
}
