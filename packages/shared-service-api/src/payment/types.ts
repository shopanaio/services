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

export type ListPaymentMethodsInput = Readonly<{ currency: string }>;

/**
 * Raw response shape returned by the payment service for get methods endpoints.
 */
export type GetPaymentMethodsResponse = {
  /** Payment methods available for the project/checkout. */
  methods: PaymentMethod[];
  /** Optional warnings emitted by the service. */
  warnings?: Array<{ code: string; message: string }>;
};

/**
 * Input for getting payment methods for checkout
 */
export type GetPaymentMethodsInput = {
  /** Project identifier for multi-tenant isolation */
  storeId: string;
  /** Currency code for payment methods filtering */
  currencyCode: string;
  /** API key for authentication */
  apiKey: string;
};

/**
 * High-level client interface for the payment service.
 */
export interface PaymentApiClient {
  /**
   * Fetch all available payment methods for a checkout.
   * @param input - Payment methods request input
   * @returns Array of payment methods available for the checkout
   */
  getPaymentMethods(input: GetPaymentMethodsInput): Promise<PaymentMethod[]>;
}
