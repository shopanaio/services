import type {
  ValidateCheckoutRequest,
  ValidateCheckoutResult,
} from "../contracts/index.js";

/**
 * Interface for the checkout-owned validation/function pipeline.
 * The runner must use the exported request parser before execution and the
 * request-relative result parser for every untrusted function response.
 */
export interface CheckoutValidationPort {
  // TODO(checkout-pipeline): implement with CheckoutFunctionRunner.
  validate(request: ValidateCheckoutRequest): Promise<ValidateCheckoutResult>;
}
