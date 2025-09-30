import { PaymentMethod } from "@shopana/plugin-sdk/payment";

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
  projectId: string;
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
