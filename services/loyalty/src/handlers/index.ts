import { Injectable } from "@nestjs/common";
import {
  CatchAllEventHandler,
  EventHandler,
  EventHandlers,
  hashContent,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type {
  CustomerDeletedEvent,
  CustomerMergedEvent,
  DomainEvent,
  EventHandlerDelivery,
  EventHandlerResponse,
  OrderRewardEligibleEvent,
  OrderRewardReversedEvent,
  StoreDeletedEvent,
} from "@shopana/events";
import type { ContextStore } from "@shopana/shared-context";
import { AccountLifecycleService } from "../application/accounts/AccountLifecycleService.js";
import { LoyaltyDomainError } from "../application/errors.js";
import { runWithContext, ServiceContext } from "../context/index.js";
import { Kernel } from "../kernel/Kernel.js";
import { Loader } from "../loaders/Loader.js";
import type { ExternalRewardWorkflowResult } from "../workflows/ExternalRewardWorkflow.js";

type GetStoreByIdResult = {
  store: ContextStore | null;
  userErrors: readonly { message: string }[];
};

/**
 * Broker integration point for Loyalty event consumers and universal earning facts.
 */
@Injectable()
export class LoyaltyEventHandlers extends EventHandlers {
  constructor(@InjectBroker("loyalty") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @CatchAllEventHandler({ retry: { maxAttempts: 10 } })
  async handleExternalEarning(params: {
    event: DomainEvent<string, Record<string, unknown>>;
    delivery: EventHandlerDelivery;
  }): Promise<EventHandlerResponse> {
    const { event } = params;
    if (
      isExplicitlyHandledEvent(event.eventType) ||
      event.source === "loyalty" ||
      event.eventType.startsWith("loyalty")
    ) {
      return { success: true };
    }
    const storeId = optionalString(event.payload.storeId);
    const customerId =
      optionalString(event.payload.customerId) ??
      (event.subject.type === "customer" ? event.subject.id : null);
    if (!storeId || !customerId) return { success: true };
    try {
      const result = await this.broker.runWorkflow<ExternalRewardWorkflowResult>(
        "loyalty.processExternalReward",
        {
          producer: event.source,
          externalEventId: event.eventId,
          eventType: event.eventType,
          subjectType: event.subject.type,
          subjectId: event.subject.id,
          customerId,
          storeId,
          occurredAt: event.timestamp,
          payload: { ...event.payload, eventType: event.eventType },
          triggerType: triggerForEvent(event.eventType),
          channelCode: optionalString(event.payload.channelCode) ?? undefined,
          paymentMethodCode: optionalString(event.payload.paymentMethodCode) ?? undefined,
          segmentIds: stringArray(event.payload.segmentIds),
          currencyCode: optionalString(event.payload.currencyCode) ?? undefined,
        },
        {
          source: "content",
          resourceId: event.eventId,
          operation: "processExternalReward",
          contentHash: hashContent(event),
          organizationId: event.context.organizationId,
        },
      );
      if (!result.success) {
        return {
          success: false,
          error: {
            message: result.message,
            code: "EXTERNAL_LOYALTY_EARNING_FAILED",
            retryable: result.retryable,
          },
        };
      }
      return { success: true };
    } catch (error) {
      return this.failure(error, "EXTERNAL_LOYALTY_EARNING_FAILED");
    }
  }

  @EventHandler("orderRewardEligible", { retry: { maxAttempts: 10 } })
  async handleOrderRewardEligible(params: {
    event: OrderRewardEligibleEvent;
    delivery: EventHandlerDelivery;
  }): Promise<EventHandlerResponse<{ transactionId: string; accountId: string }>> {
    try {
      const data = await this.broker.runWorkflow<
        { transactionId: string; accountId: string } | null,
        OrderRewardEligibleEvent
      >("loyalty.processOrderRewardEligible", params.event, {
        source: "content",
        resourceId: params.event.eventId,
        operation: "processOrderRewardEligible",
        contentHash: hashContent(params.event),
        organizationId: params.event.context.organizationId,
      });
      return data ? { success: true, data } : { success: true };
    } catch (error) {
      return this.failure(error, "ORDER_REWARD_EARNING_FAILED");
    }
  }

  @EventHandler("orderRewardReversed", { retry: { maxAttempts: 10 } })
  async handleOrderRewardReversed(params: {
    event: OrderRewardReversedEvent;
    delivery: EventHandlerDelivery;
  }): Promise<
    EventHandlerResponse<{
      earningReversalTransactionId: string | null;
      redemptionRestoreTransactionIds: readonly string[];
      debtPoints: string;
    }>
  > {
    try {
      const data = await this.broker.runWorkflow<
        {
          earningReversalTransactionId: string | null;
          redemptionRestoreTransactionIds: readonly string[];
          debtPoints: string;
        },
        OrderRewardReversedEvent
      >("loyalty.processOrderRewardReversed", params.event, {
        source: "content",
        resourceId: params.event.eventId,
        operation: "processOrderRewardReversed",
        contentHash: hashContent(params.event),
        organizationId: params.event.context.organizationId,
      });
      return { success: true, data };
    } catch (error) {
      return this.failure(error, "ORDER_REWARD_REVERSAL_FAILED");
    }
  }

  @EventHandler("customerMerged", { retry: { maxAttempts: 10 } })
  async handleCustomerMerged(params: {
    event: CustomerMergedEvent;
    delivery: EventHandlerDelivery;
  }): Promise<EventHandlerResponse> {
    try {
      await this.withStore(params.event.payload.storeId, params.delivery.idempotencyKey, () =>
        new AccountLifecycleService(this.kernel.repository).mergeCustomers({
          sourceCustomerId: params.event.payload.sourceCustomerId,
          targetCustomerId: params.event.payload.targetCustomerId,
          mergeId: params.event.payload.mergeId,
          mergeRevision: params.event.payload.mergeRevision,
          occurredAt: params.event.payload.completedAt,
        }),
      );
      return { success: true };
    } catch (error) {
      return this.failure(error, "CUSTOMER_LOYALTY_MERGE_FAILED");
    }
  }

  @EventHandler("customerDeleted", { retry: { maxAttempts: 5 } })
  async handleCustomerDeleted(params: {
    event: CustomerDeletedEvent;
    delivery: EventHandlerDelivery;
  }): Promise<EventHandlerResponse> {
    try {
      await this.withStore(params.event.payload.storeId, params.delivery.idempotencyKey, () =>
        new AccountLifecycleService(this.kernel.repository).closeCustomer(
          params.event.payload.customerId,
          params.event.payload.deletedAt,
        ),
      );
      return { success: true };
    } catch (error) {
      return this.failure(error, "CUSTOMER_LOYALTY_CLOSE_FAILED");
    }
  }

  @EventHandler("storeDeleted", { retry: { maxAttempts: 10 } })
  async handleStoreDeleted(params: {
    event: StoreDeletedEvent;
    delivery: EventHandlerDelivery;
  }): Promise<EventHandlerResponse<{ closedAccounts: number }>> {
    try {
      const data = await this.broker.runWorkflow<
        { closedAccounts: number },
        { storeId: string; organizationId: string; occurredAt: string; eventId: string }
      >(
        "loyalty.closeStore",
        {
          storeId: params.event.payload.storeId,
          organizationId: params.event.payload.organizationId,
          occurredAt: params.event.timestamp,
          eventId: params.event.eventId,
        },
        {
          source: "content",
          resourceId: params.event.payload.storeId,
          operation: "closeStoreLoyalty",
          contentHash: hashContent({ eventId: params.event.eventId }),
          organizationId: params.event.context.organizationId,
        },
      );
      return { success: true, data };
    } catch (error) {
      return this.failure(error, "STORE_LOYALTY_CLOSE_FAILED");
    }
  }

  private async withStore<T>(
    storeId: string,
    requestId: string,
    work: () => Promise<T>,
  ): Promise<T> {
    const result = await this.broker.call<GetStoreByIdResult, { id: string }>(
      "project.getStoreById",
      { id: storeId },
    );
    if (!result.store)
      throw new Error(result.userErrors[0]?.message ?? `Store ${storeId} was not found`);
    return runWithContext(
      new ServiceContext({
        requestId,
        kernel: this.kernel,
        loaders: new Loader(this.kernel.repository),
        store: result.store,
        locale: result.store.defaultLocale,
        currency: result.store.currencyCode,
      }),
      work,
    );
  }

  private failure(error: unknown, code: string): EventHandlerResponse<any> {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
        code,
        retryable: error instanceof LoyaltyDomainError ? error.retryable : true,
      },
    };
  }
}

const EXPLICITLY_HANDLED_EVENTS = new Set([
  "orderRewardEligible",
  "orderRewardReversed",
  "customerMerged",
  "customerDeleted",
  "storeDeleted",
]);

function isExplicitlyHandledEvent(eventType: string): boolean {
  return EXPLICITLY_HANDLED_EVENTS.has(eventType);
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function stringArray(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function triggerForEvent(
  eventType: string,
):
  | "SIGNUP"
  | "REVIEW"
  | "REFERRAL"
  | "BIRTHDAY"
  | "ANNIVERSARY"
  | "LOGIN"
  | "SUBSCRIPTION_RENEWAL"
  | "CUSTOM_EVENT" {
  const normalized = eventType.toLowerCase();
  if (
    normalized.includes("signup") ||
    normalized === "customercreated" ||
    normalized === "customeraccountactivated"
  )
    return "SIGNUP";
  if (normalized.includes("review")) return "REVIEW";
  if (normalized.includes("referral")) return "REFERRAL";
  if (normalized.includes("birthday")) return "BIRTHDAY";
  if (normalized.includes("anniversary")) return "ANNIVERSARY";
  if (normalized.includes("login")) return "LOGIN";
  if (normalized.includes("subscription") && normalized.includes("renew"))
    return "SUBSCRIPTION_RENEWAL";
  return "CUSTOM_EVENT";
}

/** Public event-handler bindings and signatures. */
export { LoyaltyEventHandlerBindings, LoyaltyEventHandlerNames } from "../contracts/handlers.js";
export type {
  LoyaltyConsumableEvent,
  LoyaltyEventHandlerContract,
  LoyaltyEventHandlerContracts,
} from "../contracts/events.js";
