import type { Catalog } from "@shopana/broker-types";

export type CheckoutMerchandiseErrorCode =
  | "CATALOG_CHECKOUT_SOURCE_UNAVAILABLE"
  | "CATALOG_CHECKOUT_DATA_INVARIANT";

export class CheckoutMerchandiseError extends Error {
  constructor(
    readonly code: CheckoutMerchandiseErrorCode,
    message: string,
    readonly retryable: boolean,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "CheckoutMerchandiseError";
  }
}

export class CheckoutMerchandiseInfrastructureError extends CheckoutMerchandiseError {
  constructor(message: string, cause?: unknown) {
    super("CATALOG_CHECKOUT_SOURCE_UNAVAILABLE", message, true, cause);
    this.name = "CheckoutMerchandiseInfrastructureError";
  }
}

export class CheckoutMerchandiseInvariantError extends CheckoutMerchandiseError {
  constructor(message: string, details?: unknown) {
    super("CATALOG_CHECKOUT_DATA_INVARIANT", message, true, details);
    this.name = "CheckoutMerchandiseInvariantError";
  }
}

export function toCheckoutMerchandiseFailure(
  error: unknown,
): Extract<Catalog.ResolveCheckoutMerchandiseResult, { ok: false }> {
  return {
    ok: false,
    code: "CHECKOUT_MERCHANDISE_RESOLUTION_FAILED",
    message: "Checkout merchandise resolution failed",
    retryable: error instanceof CheckoutMerchandiseError ? error.retryable : false,
  };
}
