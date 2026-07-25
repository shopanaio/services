export enum PaymentMode {
  IMMEDIATE = "IMMEDIATE",
  DEFERRED = "DEFERRED",
  FREE = "FREE",
}

export type ChildPriceType =
  | "FREE"
  | "BASE"
  | "DISCOUNT_AMOUNT"
  | "DISCOUNT_PERCENT"
  | "MARKUP_AMOUNT"
  | "MARKUP_PERCENT"
  | "OVERRIDE";

export type ChildPriceConfigInput = Readonly<{
  type: ChildPriceType;
  amount?: number;
  percent?: number;
}>;

export type PurchasableSnapshot = Readonly<{
  title: string;
  sku: string | null;
  imageUrl: string | null;
  data: Record<string, unknown> | null;
}>;

export type InventoryOffer = Readonly<{
  purchasableId: string;
  unitPrice: number;
  unitOriginalPrice: number;
  unitCompareAtPrice?: number | null;
  isAvailable: boolean;
  isPhysical: boolean;
  paymentMode: PaymentMode;
  purchasableSnapshot?: PurchasableSnapshot;
  providerPayload?: Record<string, unknown>;
  appliedPriceConfig?: ChildPriceConfigInput;
  children?: ReadonlyArray<InventoryOffer>;
  groupId?: string;
  groupItemId?: string;
  maxQuantity?: number;
  validationError?: string;
}>;

export type GetOffersChildInput = Readonly<{
  lineId: string;
  purchasableId: string;
  quantity: number;
}>;

export type GetOffersItemInput = Readonly<{
  lineId: string;
  purchasableId: string;
  quantity: number;
  children?: ReadonlyArray<GetOffersChildInput>;
}>;

export type GetOffersInput = Readonly<{
  items: ReadonlyArray<GetOffersItemInput>;
  storeId?: string;
  apiKey?: string;
  currency?: string;
  locale?: string;
}>;

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
      storeId: string;
      apiKey: string;
    }
  ): Promise<InventoryOffer[]>;
}
