import { OrderRewardEventTypes } from "@shopana/events";

/** Stable handler names used by the event registry and operational tooling. */
export const LoyaltyEventHandlerNames = {
  orderRewardEligible: "handleOrderRewardEligible",
  orderRewardReversed: "handleOrderRewardReversed",
  customerMerged: "handleCustomerMerged",
  customerDeleted: "handleCustomerDeleted",
  storeDeleted: "handleStoreDeleted",
} as const;

export const LoyaltyEventHandlerBindings = [
  {
    eventType: OrderRewardEventTypes.eligible,
    method: LoyaltyEventHandlerNames.orderRewardEligible,
    maxAttempts: 10,
  },
  {
    eventType: OrderRewardEventTypes.reversed,
    method: LoyaltyEventHandlerNames.orderRewardReversed,
    maxAttempts: 10,
  },
  {
    eventType: "customerMerged",
    method: LoyaltyEventHandlerNames.customerMerged,
    maxAttempts: 10,
  },
  {
    eventType: "customerDeleted",
    method: LoyaltyEventHandlerNames.customerDeleted,
    maxAttempts: 5,
  },
  {
    eventType: "storeDeleted",
    method: LoyaltyEventHandlerNames.storeDeleted,
    maxAttempts: 10,
  },
] as const;
