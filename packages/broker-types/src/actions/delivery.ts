import type {
  CalculateCheckoutPreliminaryQuoteResult,
  PricingCheckoutJsonObject,
  PricingCheckoutMoney,
  PricingCheckoutStageProvenance,
} from "./pricing.js";

export const DeliveryCheckoutActionNames = {
  calculateOptions: "calculateCheckoutDeliveryOptions",
} as const;

export const DeliveryCheckoutActions = {
  calculateOptions:
    `delivery.${DeliveryCheckoutActionNames.calculateOptions}`,
} as const;

export interface DeliveryCheckoutEvaluationContext {
  executionId: string;
  correlationId: string;
  deadlineAt: string;
  requestedAt: string;
  checkoutId: string;
  expectedCheckoutVersion: number;
  storeId: string;
  currencyCode: string;
  localeCode: string | null;
  channelCode: string;
  effectiveAt: string;
}

/** Delivery receives contact/address PII only for carrier option resolution. */
export interface DeliveryCheckoutAddress {
  id: string;
  address1: string;
  address2: string | null;
  city: string;
  countryCode: string;
  provinceCode: string | null;
  provinceName: string | null;
  postalCode: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  providerData: PricingCheckoutJsonObject | null;
}

export interface DeliveryCheckoutDestinationIntent {
  destinationId: string;
  address: DeliveryCheckoutAddress;
  lineIds: readonly string[];
}

export interface DeliveryCheckoutOptionSelectionIntent {
  groupId: string;
  optionHandle: string;
  customerInput: PricingCheckoutJsonObject | null;
}

export type DeliveryCheckoutMethodType = "PICKUP" | "SHIPPING";
export type DeliveryCheckoutShippingPaymentModel =
  | "MERCHANT_COLLECTED"
  | "CARRIER_DIRECT";

export interface DeliveryCheckoutOption {
  handle: string;
  code: string;
  title: string;
  deliveryMethodType: DeliveryCheckoutMethodType;
  shippingPaymentModel: DeliveryCheckoutShippingPaymentModel;
  provider: Readonly<{
    code: string;
    data: PricingCheckoutJsonObject;
  }>;
  cost: PricingCheckoutMoney;
  estimatedMinDeliveryAt: string | null;
  estimatedMaxDeliveryAt: string | null;
}

export type DeliveryCheckoutOptionSelectionResolution =
  | Readonly<{ status: "NONE" }>
  | Readonly<{
      status: "SELECTED";
      optionHandle: string;
      customerInput: PricingCheckoutJsonObject | null;
    }>
  | Readonly<{
      status: "RESET";
      previousOptionHandle: string;
      customerInput: PricingCheckoutJsonObject | null;
      reason: Readonly<{ code: string; message: string }>;
    }>;

export interface DeliveryCheckoutGroup {
  groupId: string;
  destinationId: string;
  lineIds: readonly string[];
  options: readonly DeliveryCheckoutOption[];
  selection: DeliveryCheckoutOptionSelectionResolution;
}

export interface DeliveryCheckoutOrphanedSelectionReset {
  groupId: string;
  previousOptionHandle: string;
  customerInput: PricingCheckoutJsonObject | null;
  reason: Readonly<{ code: string; message: string }>;
}

export interface CalculateCheckoutDeliveryOptionsParams {
  context: DeliveryCheckoutEvaluationContext;
  preliminary: CalculateCheckoutPreliminaryQuoteResult;
  destinations: readonly DeliveryCheckoutDestinationIntent[];
  selections: readonly DeliveryCheckoutOptionSelectionIntent[];
}

export interface CalculateCheckoutDeliveryOptionsResult
  extends PricingCheckoutStageProvenance {
  revision: string;
  basedOnPreliminaryRevision: string;
  groups: readonly DeliveryCheckoutGroup[];
  orphanedSelectionResets: readonly DeliveryCheckoutOrphanedSelectionReset[];
}
