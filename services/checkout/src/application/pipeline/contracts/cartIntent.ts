import type {
  CheckoutPipelineAddress,
  CheckoutPipelineJsonObject,
} from "./common.js";

export type CheckoutCartLineIntent = Readonly<{
  lineId: string;
  merchandiseId: string;
  quantity: number;
  attributes: CheckoutPipelineJsonObject;
  children: readonly CheckoutCartLineIntent[];
}>;

export type CheckoutDeliveryDestinationIntent = Readonly<{
  destinationId: string;
  address: CheckoutPipelineAddress;
  lineIds: readonly string[];
}>;

export type CheckoutCartIntent = Readonly<{
  lines: readonly CheckoutCartLineIntent[];
  discountCodes: readonly string[];
  destinations: readonly CheckoutDeliveryDestinationIntent[];
  selectedDeliveryOptionHandles: Readonly<Record<string, string>>;
  selectedPaymentMethodHandle: string | null;
  attributes: CheckoutPipelineJsonObject;
}>;
