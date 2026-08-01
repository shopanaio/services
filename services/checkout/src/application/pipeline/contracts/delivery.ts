import type {
  DeliveryMethodType,
  ShippingPaymentModel,
} from "@shopana/shared-service-api";

import type {
  CheckoutPipelineExecutionContext,
  CheckoutPipelineJsonObject,
  CheckoutPipelineMoney,
  CheckoutPipelineStageProvenance,
} from "./common.js";
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
  customerInput: CheckoutPipelineJsonObject | null;
}>;

export type CheckoutDeliveryGroup = Readonly<{
  groupId: string;
  destinationId: string;
  lineIds: readonly string[];
  options: readonly CheckoutDeliveryOption[];
  selectedOptionHandle: string | null;
}>;

export type CalculateDeliveryOptionsRequest = Readonly<{
  context: CheckoutPipelineExecutionContext;
  preliminary: CalculatePreliminaryPricingResult;
}>;

export type CalculateDeliveryOptionsResult = Readonly<
  CheckoutPipelineStageProvenance & {
    revision: string;
    basedOnPreliminaryRevision: string;
    groups: readonly CheckoutDeliveryGroup[];
  }
>;
