export type PaymentsCheckoutErrorCode =
  | "PAYMENT_DISCOVERY_REQUEST_INVALID"
  | "PAYMENT_PROVIDER_ROUTE_UNAVAILABLE"
  | "PAYMENT_PROVIDER_RESPONSE_INVALID"
  | "PAYMENT_PROVIDER_DISCOVERY_UNAVAILABLE"
  | "PAYMENT_CUSTOMIZATION_FAILED"
  | "PAYMENT_CUSTOMIZATION_OUTPUT_INVALID"
  | "PAYMENT_DISCOVERY_DEADLINE_EXCEEDED"
  | "PAYMENT_DISCOVERY_PERSISTENCE_CONFLICT";

export class PaymentsCheckoutError extends Error {
  constructor(
    readonly code: PaymentsCheckoutErrorCode,
    message: string,
    readonly retryable: boolean,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "PaymentsCheckoutError";
  }
}
