export enum PaymentFlow {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
  ON_DELIVERY = "ON_DELIVERY",
}

export type PaymentMethodConstraints = Readonly<{
  shippingMethodCodes: ReadonlyArray<string>;
}>;

export type PaymentMethod = Readonly<{
  code: string;
  provider: string;
  flow: PaymentFlow;
  metadata: Record<string, unknown>;
  constraints: PaymentMethodConstraints;
}>;
