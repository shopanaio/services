import { Injectable } from "@nestjs/common";
import {
  type OrderLoyaltyRewardEligibilitySnapshot,
  type PublishOrderLoyaltyRewardEligibleParams,
  type PublishOrderLoyaltyRewardEligibleResult,
  type PublishOrderLoyaltyRewardReversedParams,
  type PublishOrderLoyaltyRewardReversedResult,
} from "@shopana/broker-types";
import type {
  EventEmitResult,
  OrderRewardEligibleEvent,
  OrderRewardReversedEvent,
} from "@shopana/events";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  type ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { Repository } from "../repositories/Repository.js";

@Injectable()
export class PublishOrderLoyaltyRewardEligibleWorkflow extends BrokerWorkflows<
  PublishOrderLoyaltyRewardEligibleParams,
  PublishOrderLoyaltyRewardEligibleResult
> {
  constructor(
    @InjectBroker("order") broker: ServiceBroker,
    private readonly repository: Repository,
  ) {
    super(broker);
  }

  @Workflow("publishLoyaltyRewardEligible")
  async run(
    input: PublishOrderLoyaltyRewardEligibleParams,
  ): Promise<PublishOrderLoyaltyRewardEligibleResult> {
    validateEligibleInput(input);
    const reward = await this.loadRewardSnapshot(input.storeId, input.orderId);
    if (!reward) return { published: false, code: "CUSTOMER_NOT_ELIGIBLE" };
    const payload: OrderRewardEligibleEvent["payload"] = {
      schemaVersion: 1,
      orderId: input.orderId,
      orderRevision: input.orderRevision,
      storeId: input.storeId,
      customerId: reward.customerId,
      currencyCode: reward.currencyCode,
      channelCode: reward.channelCode,
      customerEligibilityRevision: reward.customerEligibilityRevision,
      segmentIds: reward.segmentIds,
      segmentMembershipRevision: reward.segmentMembershipRevision,
      eligibleAmountAfterProductDiscountsMinor: reward.eligibleAmountAfterProductDiscountsMinor,
      eligibleAmountAfterAllDiscountsMinor: reward.eligibleAmountAfterAllDiscountsMinor,
      eligibleAt: input.eligibleAt,
      pricingQuoteId: reward.pricingQuoteId,
      pricingQuoteRevision: reward.pricingQuoteRevision,
      lines: reward.lines,
    };
    const emitted = await this.emit(
      input.organizationId,
      input.correlationId,
      input.orderId,
      `eligible:${input.orderRevision}`,
      "orderRewardEligible",
      payload,
    );
    return { published: true, eventId: emitted.eventId };
  }

  @WorkflowStep()
  private async loadRewardSnapshot(
    storeId: string,
    orderId: string,
  ): Promise<OrderLoyaltyRewardEligibilitySnapshot | null> {
    const order = await this.repository.order.findLoyaltyRewardRecord(orderId);
    if (!order || order.storeId !== storeId) throw new Error("ORDER_NOT_FOUND");
    return order.snapshot.loyaltyRewardEligibility;
  }

  private emit(
    organizationId: string,
    correlationId: string,
    orderId: string,
    callId: string,
    eventType: "orderRewardEligible",
    payload: OrderRewardEligibleEvent["payload"],
  ): Promise<EventEmitResult> {
    return emitOrderEvent(this.broker, {
      organizationId,
      correlationId,
      orderId,
      callId,
      eventType,
      payload,
    });
  }
}

@Injectable()
export class PublishOrderLoyaltyRewardReversedWorkflow extends BrokerWorkflows<
  PublishOrderLoyaltyRewardReversedParams,
  PublishOrderLoyaltyRewardReversedResult
> {
  constructor(
    @InjectBroker("order") broker: ServiceBroker,
    private readonly repository: Repository,
  ) {
    super(broker);
  }

  @Workflow("publishLoyaltyRewardReversed")
  async run(
    input: PublishOrderLoyaltyRewardReversedParams,
  ): Promise<PublishOrderLoyaltyRewardReversedResult> {
    validateReversedInput(input);
    await this.validateOrder(input);
    const payload: OrderRewardReversedEvent["payload"] = {
      schemaVersion: 1,
      orderId: input.orderId,
      orderRevision: input.orderRevision,
      storeId: input.storeId,
      customerId: input.customerId,
      currencyCode: input.currencyCode,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceRevision: input.sourceRevision,
      eligibleAmountAfterProductDiscountsMinor: input.eligibleAmountAfterProductDiscountsMinor,
      eligibleAmountAfterAllDiscountsMinor: input.eligibleAmountAfterAllDiscountsMinor,
      reversedAt: input.reversedAt,
      lines: input.lines,
    };
    const emitted = await emitOrderEvent(this.broker, {
      organizationId: input.organizationId,
      correlationId: input.correlationId,
      orderId: input.orderId,
      callId: `reversed:${input.sourceType}:${input.sourceId}:${input.sourceRevision}`,
      eventType: "orderRewardReversed",
      payload,
    });
    return { published: true, eventId: emitted.eventId };
  }

  @WorkflowStep()
  private async validateOrder(input: PublishOrderLoyaltyRewardReversedParams): Promise<void> {
    const order = await this.repository.order.findLoyaltyRewardRecord(input.orderId);
    if (!order || order.storeId !== input.storeId) throw new Error("ORDER_NOT_FOUND");
    const reward = order.snapshot.loyaltyRewardEligibility;
    if (
      !reward ||
      reward.customerId !== input.customerId ||
      reward.currencyCode !== input.currencyCode
    ) {
      throw new Error("ORDER_LOYALTY_REWARD_SNAPSHOT_MISMATCH");
    }
    const originalLines = new Map(reward.lines.map((line) => [line.orderLineId, line]));
    if (input.lines.length === 0) throw new Error("ORDER_LOYALTY_REVERSAL_LINES_REQUIRED");
    const totals = {
      afterProductDiscounts: 0n,
      afterAllDiscounts: 0n,
    };
    const reversedByLine = new Map<
      string,
      { quantity: number; afterProduct: bigint; afterAll: bigint }
    >();
    for (const line of input.lines) {
      const original = originalLines.get(line.orderLineId);
      const afterProduct = parseUnsigned(
        line.eligibleAmountAfterProductDiscountsMinor,
        "eligibleAmountAfterProductDiscountsMinor",
      );
      const afterAll = parseUnsigned(
        line.eligibleAmountAfterAllDiscountsMinor,
        "eligibleAmountAfterAllDiscountsMinor",
      );
      const accumulated = reversedByLine.get(line.orderLineId) ?? {
        quantity: 0,
        afterProduct: 0n,
        afterAll: 0n,
      };
      accumulated.quantity += line.quantity;
      accumulated.afterProduct += afterProduct;
      accumulated.afterAll += afterAll;
      reversedByLine.set(line.orderLineId, accumulated);
      if (
        !original ||
        line.quantity <= 0 ||
        afterProduct < afterAll ||
        accumulated.quantity > original.quantity ||
        accumulated.afterProduct > BigInt(original.eligibleAmountAfterProductDiscountsMinor) ||
        accumulated.afterAll > BigInt(original.eligibleAmountAfterAllDiscountsMinor)
      ) {
        throw new Error("ORDER_LOYALTY_REVERSAL_LINE_INVALID");
      }
      totals.afterProductDiscounts += afterProduct;
      totals.afterAllDiscounts += afterAll;
    }
    if (
      totals.afterProductDiscounts !==
        parseUnsigned(
          input.eligibleAmountAfterProductDiscountsMinor,
          "eligibleAmountAfterProductDiscountsMinor",
        ) ||
      totals.afterAllDiscounts !==
        parseUnsigned(
          input.eligibleAmountAfterAllDiscountsMinor,
          "eligibleAmountAfterAllDiscountsMinor",
        ) ||
      totals.afterProductDiscounts < totals.afterAllDiscounts ||
      (totals.afterProductDiscounts === 0n && totals.afterAllDiscounts === 0n) ||
      totals.afterProductDiscounts > BigInt(reward.eligibleAmountAfterProductDiscountsMinor) ||
      totals.afterAllDiscounts > BigInt(reward.eligibleAmountAfterAllDiscountsMinor)
    ) {
      throw new Error("ORDER_LOYALTY_REVERSAL_TOTAL_MISMATCH");
    }
  }
}

function emitOrderEvent<TPayload extends object>(
  broker: ServiceBroker,
  input: {
    organizationId: string;
    correlationId: string;
    orderId: string;
    callId: string;
    eventType: "orderRewardEligible" | "orderRewardReversed";
    payload: TPayload;
  },
): Promise<EventEmitResult> {
  const workflowId = DBOS.workflowID;
  if (!workflowId) throw new Error("ORDER_LOYALTY_WORKFLOW_CONTEXT_MISSING");
  return broker.runWorkflow<EventEmitResult>(
    "events.emit",
    {
      eventType: input.eventType,
      payload: input.payload,
      context: {
        organizationId: input.organizationId,
        correlationId: input.correlationId,
      },
      subject: { type: "order", id: input.orderId },
      actor: { type: "service" },
      emitKey: `order:${input.orderId}`,
    },
    {
      source: "workflow",
      organizationId: input.organizationId,
      workflowId,
      stepId: `emit:${input.eventType}`,
      callId: input.callId,
    },
  );
}

function validateEligibleInput(input: PublishOrderLoyaltyRewardEligibleParams): void {
  if (!Number.isSafeInteger(input.orderRevision) || input.orderRevision <= 0) {
    throw new Error("ORDER_REVISION_INVALID");
  }
  requireTimestamp(input.eligibleAt, "ORDER_LOYALTY_ELIGIBLE_AT_INVALID");
}

function validateReversedInput(input: PublishOrderLoyaltyRewardReversedParams): void {
  if (!Number.isSafeInteger(input.orderRevision) || input.orderRevision <= 0) {
    throw new Error("ORDER_REVISION_INVALID");
  }
  if (!Number.isSafeInteger(input.sourceRevision) || input.sourceRevision <= 0) {
    throw new Error("ORDER_LOYALTY_SOURCE_REVISION_INVALID");
  }
  parseUnsigned(
    input.eligibleAmountAfterProductDiscountsMinor,
    "eligibleAmountAfterProductDiscountsMinor",
  );
  parseUnsigned(input.eligibleAmountAfterAllDiscountsMinor, "eligibleAmountAfterAllDiscountsMinor");
  requireTimestamp(input.reversedAt, "ORDER_LOYALTY_REVERSED_AT_INVALID");
}

function parseUnsigned(value: string, field: string): bigint {
  if (!/^(0|[1-9][0-9]*)$/.test(value))
    throw new Error(`ORDER_LOYALTY_${field.toUpperCase()}_INVALID`);
  return BigInt(value);
}

function requireTimestamp(value: string, code: string): void {
  if (!Number.isFinite(Date.parse(value))) throw new Error(code);
}
