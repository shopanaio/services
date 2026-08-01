import type {
  DeliveryCheckoutMethodType,
  DeliveryCheckoutShippingPaymentModel,
} from "./delivery.js";
import type {
  FinalizeCheckoutPricingQuoteResult,
  PricingCheckoutEvaluationContext,
  PricingCheckoutJsonObject,
  PricingCheckoutLocation,
  PricingCheckoutMoney,
  PricingCheckoutStageProvenance,
} from "./pricing.js";

export const PaymentsCheckoutActionNames = {
  getAvailableMethods: "getCheckoutAvailablePaymentMethods",
} as const;

export const PaymentsCheckoutActions = {
  getAvailableMethods:
    `payments.${PaymentsCheckoutActionNames.getAvailableMethods}`,
} as const;

export interface PaymentsCheckoutMethodSelectionIntent {
  methodHandle: string;
  customerInput: PricingCheckoutJsonObject | null;
}

export interface PaymentsCheckoutDestinationSnapshot {
  destinationId: string;
  location: PricingCheckoutLocation;
}

/** PII-free selected-delivery facts used for payment eligibility. */
export interface PaymentsCheckoutSelectedDeliveryOption {
  handle: string;
  code: string;
  providerCode: string;
  deliveryMethodType: DeliveryCheckoutMethodType;
  shippingPaymentModel: DeliveryCheckoutShippingPaymentModel;
  cost: PricingCheckoutMoney;
}

export interface PaymentsCheckoutDeliveryGroupSnapshot {
  groupId: string;
  destinationId: string;
  lineIds: readonly string[];
  selectedOption: PaymentsCheckoutSelectedDeliveryOption | null;
}

export interface PaymentsCheckoutDeliverySnapshot
  extends PricingCheckoutStageProvenance {
  revision: string;
  basedOnPreliminaryRevision: string;
  destinations: readonly PaymentsCheckoutDestinationSnapshot[];
  groups: readonly PaymentsCheckoutDeliveryGroupSnapshot[];
}

export interface PaymentsCheckoutMethod {
  handle: string;
  code: string;
  title: string;
  provider: string;
  flow: "ONLINE" | "OFFLINE" | "ON_DELIVERY";
  metadata: PricingCheckoutJsonObject | null;
}

export type PaymentsCheckoutMethodSelectionResolution =
  | Readonly<{ status: "NONE" }>
  | Readonly<{
      status: "SELECTED";
      methodHandle: string;
      customerInput: PricingCheckoutJsonObject | null;
    }>
  | Readonly<{
      status: "RESET";
      previousMethodHandle: string;
      customerInput: PricingCheckoutJsonObject | null;
      reason: Readonly<{ code: string; message: string }>;
    }>;

export interface GetCheckoutAvailablePaymentMethodsParams {
  context: PricingCheckoutEvaluationContext;
  selection: PaymentsCheckoutMethodSelectionIntent | null;
  finalQuote: FinalizeCheckoutPricingQuoteResult;
  /** Minimal, PII-free and provider-data-free delivery eligibility facts. */
  delivery: PaymentsCheckoutDeliverySnapshot;
}

export interface GetCheckoutAvailablePaymentMethodsResult
  extends PricingCheckoutStageProvenance {
  revision: string;
  basedOnFinalQuoteRevision: string;
  basedOnDeliveryRevision: string;
  methods: readonly PaymentsCheckoutMethod[];
  selection: PaymentsCheckoutMethodSelectionResolution;
}
