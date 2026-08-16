import type {
  LoyaltyCheckoutContext,
  LoyaltyRedemptionQuote,
  LoyaltyRedemptionRejectionCode,
  LoyaltyRedemptionIneligibilityCode,
  LoyaltyRewardQuote,
} from "@shopana/broker-types";
import type { FinalizePricingQuoteResult } from "./pricing.js";

export type CheckoutLoyaltyRedemptionIntent = Readonly<{
  redeemPoints: boolean;
  requestedPoints: string | null;
  programId: string | null;
  rewardEntitlementId: string | null;
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
      rewardQuote: LoyaltyRewardQuote | null;
      rewardContext: LoyaltyCheckoutContext | null;
      payableAfterLoyalty: FinalizePricingQuoteResult["totals"]["payableTotal"];
    }>
  | Readonly<{
      status: "QUOTED";
      revision: string;
      quote: LoyaltyRedemptionQuote;
      context: LoyaltyCheckoutContext;
      rewardQuote: LoyaltyRewardQuote | null;
      rewardContext: LoyaltyCheckoutContext | null;
      payableAfterLoyalty: LoyaltyRedemptionQuote["payableAfterLoyalty"];
    }>
  | Readonly<{
      status: "NOT_APPLICABLE";
      revision: string;
      code: "CUSTOMER_REQUIRED" | "PROGRAM_NOT_FOUND" | "NO_AVAILABLE_POINTS" | LoyaltyRedemptionIneligibilityCode;
      retryable: false;
      rewardQuote: LoyaltyRewardQuote | null;
      rewardContext: LoyaltyCheckoutContext | null;
      payableAfterLoyalty: FinalizePricingQuoteResult["totals"]["payableTotal"];
    }>
  | Readonly<{
      status: "REJECTED";
      revision: string;
      code: LoyaltyRedemptionRejectionCode | string;
      message: string;
      retryable: boolean;
      rewardQuote: LoyaltyRewardQuote | null;
      rewardContext: LoyaltyCheckoutContext | null;
      payableAfterLoyalty: FinalizePricingQuoteResult["totals"]["payableTotal"];
    }>;
