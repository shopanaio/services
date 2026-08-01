import type {
  PricingCheckoutJsonObject,
  PricingCheckoutMoney,
} from "./pricing.js";
import type {
  DeliveryCheckoutMethodType,
  DeliveryCheckoutShippingPaymentModel,
} from "./delivery.js";

/** Merchant-owned configuration deciding which delivery methods are eligible. */
export type DeliveryProfileStatus = "ACTIVE" | "INACTIVE";

export type DeliveryPurchaseType =
  | "ONE_TIME"
  | "SUBSCRIPTION"
  | "PRE_ORDER";

export interface DeliveryProfileAssignment {
  /** The default profile covers every variant not assigned elsewhere. */
  scope: "ALL_UNASSIGNED" | "VARIANTS";
  variantIds: readonly string[];
  sellingPlanGroupIds: readonly string[];
}

export interface DeliveryZoneTerritory {
  countryCode: string;
  /** Empty means the whole country. */
  provinceCodes: readonly string[];
  /** Provider-independent postal patterns owned and validated by Delivery. */
  postalCodePatterns: readonly string[];
}

export interface DeliveryZoneSnapshot {
  zoneId: string;
  name: string;
  territories: readonly DeliveryZoneTerritory[];
  revision: number;
}

export type DeliveryRateCondition =
  | Readonly<{
      type: "CART_SUBTOTAL";
      operator: "GTE" | "LTE";
      amount: PricingCheckoutMoney;
    }>
  | Readonly<{
      type: "PACKAGE_WEIGHT_GRAMS";
      operator: "GTE" | "LTE";
      value: number;
    }>
  | Readonly<{
      type: "PACKAGE_ITEM_COUNT";
      operator: "GTE" | "LTE";
      value: number;
    }>
  | Readonly<{
      type: "CHANNEL";
      values: readonly string[];
    }>
  | Readonly<{
      type: "CUSTOMER_SEGMENT";
      values: readonly string[];
    }>
  | Readonly<{
      type: "PURCHASE_TYPE";
      values: readonly DeliveryPurchaseType[];
    }>;

export interface DeliveryRateConditionSet {
  match: "ALL" | "ANY";
  conditions: readonly DeliveryRateCondition[];
}

export type DeliveryMethodRateSource =
  | Readonly<{
      type: "STATIC";
      price: PricingCheckoutMoney;
    }>
  | Readonly<{
      type: "PROVIDER";
      providerAccountIds: readonly string[];
      /** Empty means every service returned by an eligible account. */
      allowedServiceCodes: readonly string[];
      /** Optional merchant-owned rate used only under the declared failure policy. */
      fallbackRate: PricingCheckoutMoney | null;
    }>;

export interface DeliveryMethodDefinitionSnapshot {
  methodDefinitionId: string;
  code: string;
  title: string;
  description: string | null;
  active: boolean;
  deliveryMethodType: DeliveryCheckoutMethodType;
  shippingPaymentModel: DeliveryCheckoutShippingPaymentModel;
  rateSource: DeliveryMethodRateSource;
  conditions: DeliveryRateConditionSet;
  /** Merchant-visible method metadata; never forwarded to a provider implicitly. */
  metadata: PricingCheckoutJsonObject | null;
  revision: number;
}

export interface DeliveryLocationGroupSnapshot {
  locationGroupId: string;
  name: string;
  fulfillmentLocationIds: readonly string[];
  zones: readonly Readonly<{
    zone: DeliveryZoneSnapshot;
    methods: readonly DeliveryMethodDefinitionSnapshot[];
  }>[];
  revision: number;
}

export interface DeliveryProfileSnapshot {
  profileId: string;
  organizationId: string;
  storeId: string;
  name: string;
  status: DeliveryProfileStatus;
  isDefault: boolean;
  priority: number;
  assignment: DeliveryProfileAssignment;
  locationGroups: readonly DeliveryLocationGroupSnapshot[];
  failurePolicy: DeliveryRateFailurePolicy;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export type DeliveryRateFailurePolicy =
  | Readonly<{ mode: "OMIT_PROVIDER_RATES" }>
  | Readonly<{ mode: "FAIL_GROUP" }>
  | Readonly<{
      mode: "USE_METHOD_FALLBACK";
      categories: readonly (
        | "PROVIDER_UNAVAILABLE"
        | "TIMEOUT"
        | "RATE_LIMITED"
      )[];
    }>;

/** Immutable configuration selected before provider fan-out. */
export interface DeliveryEligibilitySnapshot {
  eligibilityRevision: string;
  profileId: string;
  profileRevision: number;
  locationGroupId: string;
  locationGroupRevision: number;
  zoneId: string;
  zoneRevision: number;
  methodDefinitions: readonly DeliveryMethodDefinitionSnapshot[];
  failurePolicy: DeliveryRateFailurePolicy;
}
