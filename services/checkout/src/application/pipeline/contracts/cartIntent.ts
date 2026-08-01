import type {
  CheckoutPipelineAddress,
  CheckoutPipelineJsonObject,
} from "./common.js";
import type { PricingCheckoutCartLineIntent } from "@shopana/broker-types";

/** Shared verbatim with Pricing to prevent merchandise/component drift. */
export type CheckoutCartLineIntent = PricingCheckoutCartLineIntent;

export type CheckoutDeliveryDestinationIntent = Readonly<{
  destinationId: string;
  address: CheckoutPipelineAddress;
  lineIds: readonly string[];
}>;

export type CheckoutDeliveryOptionSelectionIntent = Readonly<{
  /** Stable delivery group identity; selections are never destination-scoped. */
  groupId: string;
  optionHandle: string;
  customerInput: CheckoutPipelineJsonObject | null;
}>;

export type CheckoutPaymentMethodSelectionIntent = Readonly<{
  methodHandle: string;
  customerInput: CheckoutPipelineJsonObject | null;
}>;

export type CheckoutCartIntent = Readonly<{
  lines: readonly CheckoutCartLineIntent[];
  discountCodes: readonly string[];
  destinations: readonly CheckoutDeliveryDestinationIntent[];
  selectedDeliveryOptions: readonly CheckoutDeliveryOptionSelectionIntent[];
  selectedPaymentMethod: CheckoutPaymentMethodSelectionIntent | null;
  attributes: CheckoutPipelineJsonObject;
}>;
