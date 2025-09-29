import { ShippingPaymentModel } from "@shopana/shipping-plugin-sdk";
export { ShippingPaymentModel };
export enum PaymentFlow {
  ON_DELIVERY = "ON_DELIVERY",
  ONLINE = "ONLINE",
}


export type PaymentMethod = Readonly<{
  code: string;
  provider: string;
  name: string;
  description?: string;
  paymentModel: ShippingPaymentModel;
  flow: PaymentFlow;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type GetPaymentMethodsInput = Readonly<{
  shippingMethodCode?: string;
  amountMinor?: number;
  currency?: string;
  locale?: string;
}>;

export type ProviderPaymentApi = {
  getPaymentMethods?(input?: GetPaymentMethodsInput): Promise<PaymentMethod[]>;
};
