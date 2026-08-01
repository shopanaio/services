import {
  DeliveryMethodType,
  ShippingPaymentModel,
} from "@shopana/checkout-sdk";

export { DeliveryMethodType, ShippingPaymentModel };

export type ShippingMethod = Readonly<{
  code: string;
  provider: string;
  deliveryMethodType: DeliveryMethodType;
  shippingPaymentModel: ShippingPaymentModel;
}>;
