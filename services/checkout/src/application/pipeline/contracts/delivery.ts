import type {
  DeliveryMethodType,
  ShippingPaymentModel,
} from "@shopana/shared-service-api";

import type {
  CheckoutPipelineJsonObject,
  CheckoutPipelineMoney,
  CheckoutPipelineStageContext,
  CheckoutPipelineStageProvenance,
} from "./common.js";
import type {
  CheckoutDeliveryDestinationIntent,
  CheckoutDeliveryOptionSelectionIntent,
} from "./cartIntent.js";
import type { CalculatePreliminaryPricingResult } from "./pricing.js";

export type CheckoutDeliveryOption = Readonly<{
  handle: string;
  code: string;
  title: string;
  deliveryMethodType:
    | DeliveryMethodType.PICKUP
    | DeliveryMethodType.SHIPPING;
  shippingPaymentModel: ShippingPaymentModel;
  provider: Readonly<{
    code: string;
    data: CheckoutPipelineJsonObject;
  }>;
  cost: CheckoutPipelineMoney;
  estimatedMinDeliveryAt: string | null;
  estimatedMaxDeliveryAt: string | null;
}>;

export type CheckoutDeliveryOptionSelectionResolution =
  | Readonly<{ status: "NONE" }>
  | Readonly<{
      status: "SELECTED";
      optionHandle: string;
      customerInput: CheckoutPipelineJsonObject | null;
    }>
  | Readonly<{
      status: "RESET";
      previousOptionHandle: string;
      customerInput: CheckoutPipelineJsonObject | null;
      reason: Readonly<{ code: string; message: string }>;
    }>;

export type CheckoutDeliveryGroup = Readonly<{
  groupId: string;
  destinationId: string;
  lineIds: readonly string[];
  options: readonly CheckoutDeliveryOption[];
  selection: CheckoutDeliveryOptionSelectionResolution;
}>;

export type CheckoutOrphanedDeliverySelectionReset = Readonly<{
  groupId: string;
  previousOptionHandle: string;
  customerInput: CheckoutPipelineJsonObject | null;
  reason: Readonly<{ code: string; message: string }>;
}>;

export type CalculateDeliveryOptionsRequest = Readonly<{
  context: CheckoutPipelineStageContext;
  preliminary: CalculatePreliminaryPricingResult;
  destinations: readonly CheckoutDeliveryDestinationIntent[];
  selections: readonly CheckoutDeliveryOptionSelectionIntent[];
}>;

export type CalculateDeliveryOptionsResult = Readonly<
  CheckoutPipelineStageProvenance & {
    revision: string;
    basedOnPreliminaryRevision: string;
    groups: readonly CheckoutDeliveryGroup[];
    orphanedSelectionResets: readonly CheckoutOrphanedDeliverySelectionReset[];
  }
>;
