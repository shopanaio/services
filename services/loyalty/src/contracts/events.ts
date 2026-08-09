import type {
  CustomerDeletedEvent,
  CustomerMergedEvent,
  EventHandlerDelivery,
  EventHandlerResponse,
  OrderRewardEligibleEvent,
  OrderRewardReversedEvent,
  StoreDeletedEvent,
} from "@shopana/events";

export interface LoyaltyEventHandlerContract<TEvent, TResult = void> {
  (params: {
    event: TEvent;
    delivery: EventHandlerDelivery;
  }): Promise<EventHandlerResponse<TResult>>;
}

/** Events consumed by Loyalty. Implementations must use eventId as idempotency input. */
export interface LoyaltyEventHandlerContracts {
  orderRewardEligible: LoyaltyEventHandlerContract<
    OrderRewardEligibleEvent,
    { transactionId: string; accountId: string }
  >;
  orderRewardReversed: LoyaltyEventHandlerContract<
    OrderRewardReversedEvent,
    {
      earningReversalTransactionId: string | null;
      redemptionRestoreTransactionIds: readonly string[];
      debtPoints: string;
    }
  >;
  customerMerged: LoyaltyEventHandlerContract<CustomerMergedEvent>;
  customerDeleted: LoyaltyEventHandlerContract<CustomerDeletedEvent>;
  storeDeleted: LoyaltyEventHandlerContract<StoreDeletedEvent>;
}

/** Generic event envelope accepted by catch-all audit and reconciliation consumers. */
export type LoyaltyConsumableEvent =
  | OrderRewardEligibleEvent
  | OrderRewardReversedEvent
  | CustomerMergedEvent
  | CustomerDeletedEvent
  | StoreDeletedEvent;
