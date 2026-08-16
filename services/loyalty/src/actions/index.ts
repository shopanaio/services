import { Injectable } from "@nestjs/common";
import {
  BrokerActions,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";

/**
 * Broker integration point for Loyalty actions.
 * Domain actions are added here when their application services are implemented.
 */
@Injectable()
export class LoyaltyBrokerActions extends BrokerActions {
  constructor(@InjectBroker("loyalty") broker: ServiceBroker) {
    super(broker);
  }
}

/** Public broker action contracts. */
export {
  LoyaltyActionNames,
  LoyaltyActions,
  LoyaltyCheckoutActionNames,
  LoyaltyCheckoutActions,
} from "@shopana/broker-types";

export type {
  CommitCheckoutLoyaltyRedemptionParams,
  CommitCheckoutLoyaltyRedemptionResult,
  ExpireCheckoutLoyaltyRedemptionsParams,
  ExpireCheckoutLoyaltyRedemptionsResult,
  GetCustomerLoyaltyAccountParams,
  GetCustomerLoyaltyAccountResult,
  LoyaltyAccountBalanceSnapshot,
  LoyaltyAccountSnapshot,
  LoyaltyCheckoutContext,
  LoyaltyCheckoutMoney,
  LoyaltyProgramSnapshot,
  LoyaltyRedemptionQuote,
  LoyaltyRedemptionIneligibilityCode,
  LoyaltyRedemptionRejectionCode,
  QuoteCheckoutLoyaltyRedemptionParams,
  QuoteCheckoutLoyaltyRedemptionResult,
  ReleaseCheckoutLoyaltyRedemptionParams,
  ReleaseCheckoutLoyaltyRedemptionResult,
  ReserveCheckoutLoyaltyRedemptionParams,
  ReserveCheckoutLoyaltyRedemptionResult,
  ReverseCheckoutLoyaltyRedemptionParams,
  ReverseCheckoutLoyaltyRedemptionResult,
} from "@shopana/broker-types";
