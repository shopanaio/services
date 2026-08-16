import type {
  LoyaltyCheckoutContext,
  LoyaltyRedemptionQuote,
  LoyaltyRedemptionRejectionCode,
  LoyaltyRedemptionIneligibilityCode,
} from "@shopana/broker-types";
import type { FinalizePricingQuoteResult } from "./pricing.js";

export type CheckoutLoyaltyRedemptionIntent = Readonly<{
  requestedPoints: string | null;
  programId: string | null;
}>;

export type QuoteCheckoutLoyaltyRequest = Readonly<{
  context: LoyaltyCheckoutContext;
  intent: CheckoutLoyaltyRedemptionIntent | null;
  finalQuote: FinalizePricingQuoteResult;
}>;

export type CheckoutLoyaltyQuoteResult =
  | Readonly<{
      status: "NONE";
      revision: string;
      payableAfterLoyalty: FinalizePricingQuoteResult["totals"]["payableTotal"];
    }>
  | Readonly<{
      status: "QUOTED";
      revision: string;
      quote: LoyaltyRedemptionQuote;
      context: LoyaltyCheckoutContext;
      payableAfterLoyalty: LoyaltyRedemptionQuote["payableAfterLoyalty"];
    }>
  | Readonly<{
      status: "NOT_APPLICABLE";
      revision: string;
      code: "CUSTOMER_REQUIRED" | "PROGRAM_NOT_FOUND" | "NO_AVAILABLE_POINTS" | LoyaltyRedemptionIneligibilityCode;
      retryable: false;
      payableAfterLoyalty: FinalizePricingQuoteResult["totals"]["payableTotal"];
    }>
  | Readonly<{
      status: "REJECTED";
      revision: string;
      code: LoyaltyRedemptionRejectionCode;
      message: string;
      retryable: boolean;
      payableAfterLoyalty: FinalizePricingQuoteResult["totals"]["payableTotal"];
    }>;
