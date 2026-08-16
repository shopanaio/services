import type {
  CheckoutLoyaltyQuoteResult,
  QuoteCheckoutLoyaltyRequest,
} from "../contracts/loyalty.js";

export interface LoyaltyCheckoutPort {
  quote(request: QuoteCheckoutLoyaltyRequest): Promise<CheckoutLoyaltyQuoteResult>;
}
