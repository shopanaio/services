import { Injectable } from "@nestjs/common";
import {
  OrderLoyaltyActions,
  type PaymentEvents,
  type PublishOrderLoyaltyRewardReversedResult,
} from "@shopana/broker-types";
import type { DomainEvent, EventHandlerDelivery, EventHandlerResponse } from "@shopana/events";
import {
  EventHandler,
  EventHandlers,
  InjectBroker,
  type ServiceBroker,
} from "@shopana/shared-kernel";
import { sql } from "drizzle-orm";
import { Repository } from "../repositories/Repository.js";

type PaymentEventPayload =
  | PaymentEvents.CollectionStateChanged
  | PaymentEvents.SessionCreated
  | PaymentEvents.RequiresAction
  | PaymentEvents.RequiresConfirmation
  | PaymentEvents.ConfirmationCompleted
  | PaymentEvents.Pending
  | PaymentEvents.Cancelled
  | PaymentEvents.Authorized
  | PaymentEvents.Captured
  | PaymentEvents.Failed
  | PaymentEvents.Voided
  | PaymentEvents.Refunded
  | PaymentEvents.Expired
  | PaymentEvents.DisputeChanged;

export type PaymentDomainEvent = DomainEvent<string, PaymentEventPayload>;

@Injectable()
export class OrderPaymentEventHandlers extends EventHandlers {
  constructor(
    @InjectBroker("order") broker: ServiceBroker,
    private readonly repository: Repository,
  ) {
    super(broker);
  }

  @EventHandler("payment.collection.state_changed", { retry: { maxAttempts: 20 } })
  handleCollectionStateChanged(input: {
    event: DomainEvent<"payment.collection.state_changed", PaymentEvents.CollectionStateChanged>;
    delivery: EventHandlerDelivery;
  }) {
    return this.project(input.event);
  }

  @EventHandler("payment.session.created", { retry: { maxAttempts: 20 } })
  handleSessionCreated(input: { event: PaymentDomainEvent; delivery: EventHandlerDelivery }) {
    return this.project(input.event);
  }

  @EventHandler("payment.requires_action", { retry: { maxAttempts: 20 } })
  handleRequiresAction(input: { event: PaymentDomainEvent; delivery: EventHandlerDelivery }) {
    return this.project(input.event);
  }

  @EventHandler("payment.requires_confirmation", { retry: { maxAttempts: 20 } })
  handleRequiresConfirmation(input: { event: PaymentDomainEvent; delivery: EventHandlerDelivery }) {
    return this.project(input.event);
  }

  @EventHandler("payment.confirmation.completed", { retry: { maxAttempts: 20 } })
  handleConfirmationCompleted(input: {
    event: PaymentDomainEvent;
    delivery: EventHandlerDelivery;
  }) {
    return this.project(input.event);
  }

  @EventHandler("payment.pending", { retry: { maxAttempts: 20 } })
  handlePending(input: { event: PaymentDomainEvent; delivery: EventHandlerDelivery }) {
    return this.project(input.event);
  }

  @EventHandler("payment.cancelled", { retry: { maxAttempts: 20 } })
  async handleCancelled(input: { event: PaymentDomainEvent; delivery: EventHandlerDelivery }) {
    return this.projectWithLoyaltyReversal(input.event, "CANCELLATION");
  }

  @EventHandler("payment.authorized", { retry: { maxAttempts: 20 } })
  handleAuthorized(input: { event: PaymentDomainEvent; delivery: EventHandlerDelivery }) {
    return this.project(input.event);
  }

  @EventHandler("payment.captured", { retry: { maxAttempts: 20 } })
  handleCaptured(input: { event: PaymentDomainEvent; delivery: EventHandlerDelivery }) {
    return this.project(input.event);
  }

  @EventHandler("payment.failed", { retry: { maxAttempts: 20 } })
  handleFailed(input: { event: PaymentDomainEvent; delivery: EventHandlerDelivery }) {
    return this.project(input.event);
  }

  @EventHandler("payment.voided", { retry: { maxAttempts: 20 } })
  async handleVoided(input: { event: PaymentDomainEvent; delivery: EventHandlerDelivery }) {
    const voided = input.event.payload as PaymentEvents.Voided;
    return voided.resultingState === "VOIDED"
      ? this.projectWithLoyaltyReversal(input.event, "CANCELLATION")
      : this.project(input.event);
  }

  @EventHandler("payment.refunded", { retry: { maxAttempts: 20 } })
  async handleRefunded(input: { event: PaymentDomainEvent; delivery: EventHandlerDelivery }) {
    const projected = await this.project(input.event);
    if (!projected.success) return projected;
    try {
      await this.publishLoyaltyRefund(
        input.event as DomainEvent<"payment.refunded", PaymentEvents.Refunded>,
      );
      return projected;
    } catch (error) {
      return {
        success: false as const,
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: "ORDER_LOYALTY_REFUND_PUBLISH_FAILED",
          retryable: true,
        },
      };
    }
  }

  @EventHandler("payment.expired", { retry: { maxAttempts: 20 } })
  handleExpired(input: { event: PaymentDomainEvent; delivery: EventHandlerDelivery }) {
    return this.project(input.event);
  }

  @EventHandler("payment.dispute.changed", { retry: { maxAttempts: 20 } })
  handleDisputeChanged(input: { event: PaymentDomainEvent; delivery: EventHandlerDelivery }) {
    return this.project(input.event);
  }

  private async project(event: PaymentDomainEvent): Promise<EventHandlerResponse> {
    try {
      await this.broker.runWorkflow(
        "order.projectPaymentEventV1",
        { contractVersion: 1, event },
        {
          source: "content",
          organizationId: event.payload.organizationId,
          resourceId: event.payload.orderId,
          operation: "projectPaymentEventV1",
          content: { eventId: event.eventId, eventType: event.eventType, payload: event.payload },
        },
      );
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: {
          message,
          code: "ORDER_PAYMENT_PROJECTION_FAILED",
          retryable: !message.includes("does not exist"),
        },
      };
    }
  }

  private async publishLoyaltyRefund(
    event: DomainEvent<"payment.refunded", PaymentEvents.Refunded>,
  ): Promise<void> {
    const order = await this.repository.order.findLoyaltyRewardRecord(event.payload.orderId);
    const reward = order?.snapshot.loyaltyRewardEligibility;
    if (!order || !reward) return;
    const denominator = BigInt(event.payload.sessionAmount.amountMinor);
    const refunded = BigInt(event.payload.amount.amountMinor);
    if (denominator <= 0n || refunded <= 0n) return;
    const afterProduct = proportional(
      BigInt(reward.eligibleAmountAfterProductDiscountsMinor),
      refunded,
      denominator,
    );
    const afterAll = proportional(
      BigInt(reward.eligibleAmountAfterAllDiscountsMinor),
      refunded,
      denominator,
    );
    if (afterProduct === 0n && afterAll === 0n) return;
    const allAllocations = allocateProportionally(
      reward.lines.map((line) => BigInt(line.eligibleAmountAfterAllDiscountsMinor)),
      afterAll,
    );
    const productAllocations = allocateWithMinimum(
      reward.lines.map((line) => BigInt(line.eligibleAmountAfterProductDiscountsMinor)),
      afterProduct,
      allAllocations,
    );
    const lines = reward.lines
      .map((line, index) => ({
        orderLineId: line.orderLineId,
        quantity: line.quantity,
        eligibleAmountAfterProductDiscountsMinor: productAllocations[index]!.toString(),
        eligibleAmountAfterAllDiscountsMinor: allAllocations[index]!.toString(),
      }))
      .filter(
        (line) =>
          line.eligibleAmountAfterProductDiscountsMinor !== "0" ||
          line.eligibleAmountAfterAllDiscountsMinor !== "0",
      );
    if (lines.length === 0) return;
    await this.broker.call<PublishOrderLoyaltyRewardReversedResult>(
      OrderLoyaltyActions.publishReversed,
      {
        organizationId: event.payload.organizationId,
        storeId: event.payload.storeId,
        orderId: event.payload.orderId,
        orderRevision: 1,
        customerId: reward.customerId,
        currencyCode: reward.currencyCode,
        sourceType: "REFUND",
        sourceId: event.payload.operationId,
        sourceRevision: requiredEventSequence(event),
        eligibleAmountAfterProductDiscountsMinor: afterProduct.toString(),
        eligibleAmountAfterAllDiscountsMinor: afterAll.toString(),
        reversedAt: event.payload.occurredAt,
        correlationId: event.context.correlationId,
        lines,
      },
    );
  }

  private async projectWithLoyaltyReversal(
    event: PaymentDomainEvent,
    sourceType: "CANCELLATION" | "ORDER_CORRECTION",
  ): Promise<EventHandlerResponse> {
    const projected = await this.project(event);
    if (!projected.success) return projected;
    try {
      await this.publishFullLoyaltyReversal(event, sourceType);
      return projected;
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: "ORDER_LOYALTY_REVERSAL_PUBLISH_FAILED",
          retryable: true,
        },
      };
    }
  }

  private async publishFullLoyaltyReversal(
    event: PaymentDomainEvent,
    sourceType: "CANCELLATION" | "ORDER_CORRECTION",
  ): Promise<void> {
    if (!("operationId" in event.payload)) {
      throw new Error("PAYMENT_OPERATION_ID_REQUIRED_FOR_LOYALTY_REVERSAL");
    }
    const order = await this.repository.order.findLoyaltyRewardRecord(event.payload.orderId);
    const reward = order?.snapshot.loyaltyRewardEligibility;
    if (!order || !reward) return;
    await this.broker.call<PublishOrderLoyaltyRewardReversedResult>(
      OrderLoyaltyActions.publishReversed,
      {
        organizationId: event.payload.organizationId,
        storeId: event.payload.storeId,
        orderId: event.payload.orderId,
        orderRevision: 1,
        customerId: reward.customerId,
        currencyCode: reward.currencyCode,
        sourceType,
        sourceId: event.payload.operationId,
        sourceRevision: requiredEventSequence(event),
        eligibleAmountAfterProductDiscountsMinor: reward.eligibleAmountAfterProductDiscountsMinor,
        eligibleAmountAfterAllDiscountsMinor: reward.eligibleAmountAfterAllDiscountsMinor,
        reversedAt: event.payload.occurredAt,
        correlationId: event.context.correlationId,
        lines: reward.lines.map((line) => ({
          orderLineId: line.orderLineId,
          quantity: line.quantity,
          eligibleAmountAfterProductDiscountsMinor: line.eligibleAmountAfterProductDiscountsMinor,
          eligibleAmountAfterAllDiscountsMinor: line.eligibleAmountAfterAllDiscountsMinor,
        })),
      },
    );
  }
}

export async function projectOrderPaymentEvent(
  repository: Repository,
  event: PaymentDomainEvent,
): Promise<void> {
  const payload = event.payload;
  const inserted = await repository.db.execute<{ eventId: string }>(sql`
    INSERT INTO "orders"."order_payment_event_inbox" (
      "event_id", "store_id", "order_id", "payment_collection_id",
      "event_type", "event_sequence", "payload", "occurred_at"
    ) VALUES (
      ${event.eventId}, ${payload.storeId}::uuid, ${payload.orderId}::uuid,
      ${payload.paymentCollectionId}::uuid, ${event.eventType},
      ${requiredEventSequence(event)},
      ${JSON.stringify(payload)}::jsonb, ${event.timestamp}::timestamptz
    )
    ON CONFLICT ("event_id") DO NOTHING
    RETURNING "event_id" AS "eventId"
  `);
  if (inserted.length === 0) return;
  await projectPaymentDetails(repository, event.eventType, payload);
  const paymentStatus =
    event.eventType === "payment.collection.state_changed"
      ? orderPaymentStatus((payload as PaymentEvents.CollectionStateChanged).state)
      : terminalPaymentStatus(event.eventType, payload);
  if (paymentStatus) {
    await projectPaymentStatus(
      repository,
      payload,
      paymentStatus,
      event.eventType,
      requiredEventSequence(event),
      event.eventId,
      event.context.correlationId,
    );
  }
}

function proportional(value: bigint, numerator: bigint, denominator: bigint): bigint {
  const calculated = (value * numerator) / denominator;
  return calculated > value ? value : calculated;
}

function allocateProportionally(weights: readonly bigint[], total: bigint): bigint[] {
  const weightTotal = weights.reduce((sum, value) => sum + value, 0n);
  if (total === 0n || weightTotal === 0n) return weights.map(() => 0n);
  const result = weights.map((weight) => (total * weight) / weightTotal);
  let remaining = total - result.reduce((sum, value) => sum + value, 0n);
  for (let index = 0; index < result.length && remaining > 0n; index += 1) {
    const capacity = weights[index]! - result[index]!;
    const addition = capacity < remaining ? capacity : remaining;
    result[index] = result[index]! + addition;
    remaining -= addition;
  }
  return result;
}

function allocateWithMinimum(
  capacities: readonly bigint[],
  total: bigint,
  minimums: readonly bigint[],
): bigint[] {
  const minimumTotal = minimums.reduce((sum, value) => sum + value, 0n);
  if (minimumTotal > total) throw new Error("LOYALTY_REVERSAL_ALLOCATION_INVALID");
  const remainingCapacities = capacities.map((capacity, index) => {
    const minimum = minimums[index] ?? 0n;
    if (minimum > capacity) throw new Error("LOYALTY_REVERSAL_LINE_ALLOCATION_INVALID");
    return capacity - minimum;
  });
  const additions = allocateProportionally(remainingCapacities, total - minimumTotal);
  return minimums.map((minimum, index) => minimum + additions[index]!);
}

async function projectPaymentDetails(
  repository: Repository,
  eventType: string,
  payload: PaymentEventPayload,
): Promise<void> {
  if (eventType === "payment.session.created") {
    const created = payload as PaymentEvents.SessionCreated;
    await repository.db.execute(sql`
      INSERT INTO "orders"."order_payment_attempts" (
        "id", "store_id", "order_id", "payment_method_id", "currency_code",
        "status", "requested_amount", "idempotency_key", "created_at", "updated_at"
      )
      SELECT ${created.paymentSessionId}::uuid, ${created.storeId}::uuid,
             ${created.orderId}::uuid, method."id", ${created.amount.currencyCode},
             'PENDING', ${created.amount.amountMinor}::bigint,
             ${created.paymentSessionId}, ${created.occurredAt}::timestamptz,
             ${created.occurredAt}::timestamptz
        FROM "orders"."order_payment_methods" AS method
       WHERE method."store_id" = ${created.storeId}::uuid
         AND method."order_id" = ${created.orderId}::uuid
         AND method."is_selected" = true
       LIMIT 1
      ON CONFLICT ("id") DO NOTHING
    `);
    return;
  }

  if (eventType === "payment.requires_action") {
    const action = payload as PaymentEvents.RequiresAction;
    await repository.db.execute(sql`
      UPDATE "orders"."order_payment_attempts"
         SET "status" = 'REQUIRES_ACTION',
             "provider_attempt_id" = ${action.providerReference},
             "customer_action_type" = ${action.customerAction.type}::"orders"."order_payment_customer_action_type",
             "customer_action_url" = ${action.customerAction.type === "REDIRECT" ? action.customerAction.url : null},
             "customer_action_payload" = ${JSON.stringify(action.customerAction)}::jsonb,
             "expires_at" = ${action.customerAction.expiresAt}::timestamptz,
             "updated_at" = GREATEST("updated_at", ${action.occurredAt}::timestamptz)
       WHERE "store_id" = ${action.storeId}::uuid
         AND "order_id" = ${action.orderId}::uuid
         AND "id" = ${action.paymentSessionId}::uuid
    `);
    return;
  }

  if (eventType === "payment.pending") {
    const pending = payload as PaymentEvents.Pending;
    await updateAttempt(repository, pending, "PENDING", {
      providerReference: pending.providerReference,
      expiresAt: pending.expiresAt,
    });
    return;
  }
  if (eventType === "payment.authorized") {
    const authorized = payload as PaymentEvents.Authorized;
    await updateAttempt(repository, authorized, "AUTHORIZED", {
      providerReference: authorized.providerReference,
      processedAt: authorized.occurredAt,
    });
    await insertTransaction(
      repository,
      authorized,
      "AUTHORIZATION",
      authorized.amount,
      authorized.networkTransactionId,
    );
    return;
  }
  if (eventType === "payment.captured") {
    const captured = payload as PaymentEvents.Captured;
    await updateAttempt(
      repository,
      captured,
      captured.resultingState === "CAPTURED" ? "PAID" : "AUTHORIZED",
      { providerReference: captured.providerReference, processedAt: captured.occurredAt },
    );
    await insertTransaction(
      repository,
      captured,
      captured.operationType === "CAPTURE" ? "CAPTURE" : "SALE",
      captured.amount,
      captured.networkTransactionId,
    );
    return;
  }
  if (eventType === "payment.failed") {
    const failed = payload as PaymentEvents.Failed;
    if (failed.sessionState !== "FAILED") return;
    await repository.db.execute(sql`
      UPDATE "orders"."order_payment_attempts"
         SET "status" = 'FAILED', "failure_code" = ${failed.failure.code},
             "failure_message" = ${failed.failure.message},
             "processed_at" = ${failed.occurredAt}::timestamptz,
             "updated_at" = GREATEST("updated_at", ${failed.occurredAt}::timestamptz)
       WHERE "store_id" = ${failed.storeId}::uuid
         AND "order_id" = ${failed.orderId}::uuid
         AND "id" = ${failed.paymentSessionId}::uuid
    `);
    return;
  }
  if (eventType === "payment.cancelled" || eventType === "payment.expired") {
    const terminal = payload as PaymentEvents.Cancelled | PaymentEvents.Expired;
    await updateAttempt(
      repository,
      terminal,
      eventType === "payment.cancelled" ? "CANCELLED" : "EXPIRED",
      { processedAt: terminal.occurredAt },
    );
    return;
  }
  if (eventType === "payment.voided") {
    const voided = payload as PaymentEvents.Voided;
    if (voided.resultingState === "VOIDED") {
      await updateAttempt(repository, voided, "CANCELLED", {
        providerReference: voided.providerReference,
        processedAt: voided.occurredAt,
      });
    }
    await insertVoidTransaction(repository, voided);
    return;
  }
  if (eventType === "payment.refunded") {
    const refunded = payload as PaymentEvents.Refunded;
    await insertRefundTransactions(repository, refunded);
    return;
  }
  if (eventType === "payment.dispute.changed") {
    const dispute = payload as PaymentEvents.DisputeChanged;
    await repository.db.execute(sql`
      INSERT INTO "orders"."order_payment_disputes" (
        "id", "store_id", "order_id", "currency_code", "provider",
        "provider_dispute_id", "status", "reason", "amount", "evidence",
        "response_due_at", "resolved_at", "created_at", "updated_at"
      ) VALUES (
        ${dispute.paymentDisputeId}::uuid, ${dispute.storeId}::uuid,
        ${dispute.orderId}::uuid, ${dispute.amount.currencyCode},
        ${dispute.providerCode}, ${dispute.providerDisputeReference},
        ${dispute.state}::"orders"."order_dispute_status", ${dispute.reasonCode},
        ${dispute.amount.amountMinor}::bigint,
        ${JSON.stringify({
          paymentCollectionId: dispute.paymentCollectionId,
          paymentSessionId: dispute.paymentSessionId,
          providerReference: dispute.providerReference,
        })}::jsonb,
        ${dispute.responseDueAt}::timestamptz,
        ${["WON", "LOST", "ACCEPTED", "CLOSED"].includes(dispute.state) ? dispute.occurredAt : null}::timestamptz,
        ${dispute.occurredAt}::timestamptz, ${dispute.occurredAt}::timestamptz
      )
      ON CONFLICT ("id") DO UPDATE
        SET "status" = EXCLUDED."status", "reason" = EXCLUDED."reason",
            "amount" = EXCLUDED."amount", "evidence" = EXCLUDED."evidence",
            "response_due_at" = EXCLUDED."response_due_at",
            "resolved_at" = EXCLUDED."resolved_at",
            "updated_at" = GREATEST(
              "orders"."order_payment_disputes"."updated_at",
              EXCLUDED."updated_at"
            )
    `);
  }
}

async function updateAttempt(
  repository: Repository,
  event: Exclude<
    PaymentEventPayload,
    PaymentEvents.CollectionStateChanged | PaymentEvents.DisputeChanged
  >,
  status: "PENDING" | "AUTHORIZED" | "PAID" | "CANCELLED" | "EXPIRED",
  values: Readonly<{
    providerReference?: string;
    expiresAt?: string;
    processedAt?: string;
  }>,
): Promise<void> {
  await repository.db.execute(sql`
    UPDATE "orders"."order_payment_attempts"
       SET "status" = ${status}::"orders"."order_payment_attempt_status",
           "provider_attempt_id" = COALESCE(${values.providerReference ?? null}, "provider_attempt_id"),
           "expires_at" = COALESCE(${values.expiresAt ?? null}::timestamptz, "expires_at"),
           "processed_at" = COALESCE(${values.processedAt ?? null}::timestamptz, "processed_at"),
           "updated_at" = GREATEST("updated_at", ${event.occurredAt}::timestamptz)
     WHERE "store_id" = ${event.storeId}::uuid
       AND "order_id" = ${event.orderId}::uuid
       AND "id" = ${event.paymentSessionId}::uuid
  `);
}

async function insertTransaction(
  repository: Repository,
  event: PaymentEvents.Authorized | PaymentEvents.Captured,
  kind: "AUTHORIZATION" | "CAPTURE" | "SALE",
  amount: PaymentEvents.Authorized["amount"],
  providerTransactionId: string | null,
): Promise<void> {
  if (BigInt(amount.amountMinor) <= 0n) return;
  const parentTransactionId =
    kind === "CAPTURE"
      ? await requireAuthorizationTransaction(repository, event as PaymentEvents.Captured)
      : null;
  await insertTransactionRow(repository, {
    id: event.operationId,
    event,
    kind,
    amountMinor: amount.amountMinor,
    currencyCode: amount.currencyCode,
    parentTransactionId,
    providerTransactionId,
  });
}

async function insertVoidTransaction(
  repository: Repository,
  event: PaymentEvents.Voided,
): Promise<void> {
  const parentTransactionId = await requireAuthorizationTransaction(repository, event);
  const existingRows = await repository.db.execute<{ amountMinor: string }>(sql`
    SELECT COALESCE(sum("amount"), 0)::text AS "amountMinor"
      FROM "orders"."order_payment_transactions"
     WHERE "store_id" = ${event.storeId}::uuid
       AND "order_id" = ${event.orderId}::uuid
       AND "parent_transaction_id" = ${parentTransactionId}::uuid
       AND "kind" = 'VOID'
       AND "status" = 'SUCCESS'
  `);
  const amountMinor =
    BigInt(event.voidedTotal.amountMinor) - BigInt(existingRows[0]?.amountMinor ?? "0");
  if (amountMinor <= 0n) return;
  await insertTransactionRow(repository, {
    id: event.operationId,
    event,
    kind: "VOID",
    amountMinor: amountMinor.toString(),
    currencyCode: event.voidedTotal.currencyCode,
    parentTransactionId,
    providerTransactionId: null,
  });
}

async function insertRefundTransactions(
  repository: Repository,
  event: PaymentEvents.Refunded,
): Promise<void> {
  const candidates = await repository.db.execute<{
    transactionId: string;
    remainingAmountMinor: string;
  }>(sql`
    SELECT payment."id" AS "transactionId",
           (
             payment."amount" - COALESCE((
               SELECT sum(refund."amount")
                 FROM "orders"."order_payment_transactions" AS refund
                WHERE refund."store_id" = payment."store_id"
                  AND refund."order_id" = payment."order_id"
                  AND refund."parent_transaction_id" = payment."id"
                  AND refund."kind" = 'REFUND'
                  AND refund."status" = 'SUCCESS'
             ), 0)
           )::text AS "remainingAmountMinor"
      FROM "orders"."order_payment_transactions" AS payment
     WHERE payment."store_id" = ${event.storeId}::uuid
       AND payment."order_id" = ${event.orderId}::uuid
       AND payment."payment_attempt_id" = ${event.paymentSessionId}::uuid
       AND payment."kind" IN ('CAPTURE', 'SALE')
       AND payment."status" = 'SUCCESS'
     ORDER BY payment."created_at", payment."sequence"
  `);
  let remaining = BigInt(event.amount.amountMinor);
  let allocationIndex = 0;
  for (const candidate of candidates) {
    const available = BigInt(candidate.remainingAmountMinor);
    if (available <= 0n || remaining <= 0n) continue;
    const allocated = available < remaining ? available : remaining;
    await insertTransactionRow(repository, {
      id: allocationIndex === 0 ? event.operationId : null,
      event,
      kind: "REFUND",
      amountMinor: allocated.toString(),
      currencyCode: event.amount.currencyCode,
      parentTransactionId: candidate.transactionId,
      providerTransactionId: null,
      allocationIndex,
    });
    remaining -= allocated;
    allocationIndex += 1;
  }
  if (remaining !== 0n) throw new Error("ORDER_PAYMENT_REFUND_ALLOCATION_EXCEEDED");
}

async function requireAuthorizationTransaction(
  repository: Repository,
  event: PaymentEvents.Captured | PaymentEvents.Voided,
): Promise<string> {
  const rows = await repository.db.execute<{ id: string }>(sql`
    SELECT "id"
      FROM "orders"."order_payment_transactions"
     WHERE "store_id" = ${event.storeId}::uuid
       AND "order_id" = ${event.orderId}::uuid
       AND "payment_attempt_id" = ${event.paymentSessionId}::uuid
       AND "kind" = 'AUTHORIZATION'
       AND "status" = 'SUCCESS'
     ORDER BY "created_at" DESC, "sequence" DESC
     LIMIT 1
  `);
  const id = rows[0]?.id;
  if (!id) throw new Error("ORDER_PAYMENT_AUTHORIZATION_TRANSACTION_NOT_FOUND");
  return id;
}

async function insertTransactionRow(
  repository: Repository,
  input: Readonly<{
    id: string | null;
    event:
      | PaymentEvents.Authorized
      | PaymentEvents.Captured
      | PaymentEvents.Voided
      | PaymentEvents.Refunded;
    kind: "AUTHORIZATION" | "CAPTURE" | "SALE" | "REFUND" | "VOID";
    amountMinor: string;
    currencyCode: string;
    parentTransactionId: string | null;
    providerTransactionId: string | null;
    allocationIndex?: number;
  }>,
): Promise<void> {
  const { event } = input;
  await repository.db.execute(sql`
    INSERT INTO "orders"."order_payment_transactions" (
      "id", "store_id", "order_id", "payment_attempt_id", "currency_code",
      "parent_transaction_id", "kind", "status", "amount", "provider",
      "provider_transaction_id",
      "provider_data", "processed_at", "created_at", "updated_at"
    ) VALUES (
      COALESCE(${input.id}::uuid, uuidv7()), ${event.storeId}::uuid,
      ${event.orderId}::uuid, ${event.paymentSessionId}::uuid,
      ${input.currencyCode}, ${input.parentTransactionId}::uuid,
      ${input.kind}::"orders"."order_payment_transaction_kind", 'SUCCESS',
      ${input.amountMinor}::bigint, ${event.providerCode}, ${input.providerTransactionId},
      ${JSON.stringify({
        paymentCollectionId: event.paymentCollectionId,
        paymentSessionId: event.paymentSessionId,
        operationType: event.operationType,
        operationId: event.operationId,
        allocationIndex: input.allocationIndex ?? 0,
      })}::jsonb,
      ${event.occurredAt}::timestamptz, ${event.occurredAt}::timestamptz,
      ${event.occurredAt}::timestamptz
    )
    ON CONFLICT DO NOTHING
  `);
}

async function projectPaymentStatus(
  repository: Repository,
  event: PaymentEventPayload,
  paymentStatus: string,
  eventType: string,
  eventSequence: number,
  eventId: string,
  correlationId: string,
): Promise<void> {
  const projected = await repository.db.execute<{ orderId: string }>(sql`
    INSERT INTO "orders"."order_payment_projection" (
      "store_id", "order_id", "payment_collection_id", "payment_status",
      "last_event_sequence", "updated_at"
    ) VALUES (
      ${event.storeId}::uuid, ${event.orderId}::uuid,
      ${event.paymentCollectionId}::uuid,
      ${paymentStatus}::"orders"."order_payment_status",
      ${eventSequence}, ${event.occurredAt}::timestamptz
    )
    ON CONFLICT ("store_id", "order_id") DO UPDATE
      SET "payment_collection_id" = EXCLUDED."payment_collection_id",
          "payment_status" = EXCLUDED."payment_status",
          "last_event_sequence" = EXCLUDED."last_event_sequence",
          "updated_at" = GREATEST(
            "orders"."order_payment_projection"."updated_at",
            EXCLUDED."updated_at"
          )
      WHERE "orders"."order_payment_projection"."last_event_sequence" < EXCLUDED."last_event_sequence"
    RETURNING "order_id" AS "orderId"
  `);
  if (projected.length === 0) return;
  const currentRows = await repository.db.execute<{
    revision: number;
    paymentStatus: string;
  }>(sql`
    SELECT "revision", "payment_status" AS "paymentStatus"
      FROM "orders"."orders"
     WHERE "store_id" = ${event.storeId}::uuid
       AND "id" = ${event.orderId}::uuid
     FOR UPDATE
  `);
  const current = currentRows[0];
  if (!current) throw new Error("ORDER_NOT_FOUND");
  if (current.paymentStatus === paymentStatus) return;
  const revision = current.revision + 1;
  await repository.db.execute(sql`
    UPDATE "orders"."orders"
       SET "payment_status" = ${paymentStatus}::"orders"."order_payment_status",
           "revision" = ${revision},
           "updated_at" = GREATEST("updated_at", ${event.occurredAt}::timestamptz)
     WHERE "store_id" = ${event.storeId}::uuid
       AND "id" = ${event.orderId}::uuid
  `);
  await repository.db.execute(sql`
    INSERT INTO "orders"."order_revisions" (
      "store_id", "order_id", "revision", "status", "payment_status",
      "fulfillment_status", "delivery_status", "return_status", "currency_code",
      "subtotal_amount", "discount_amount", "shipping_amount", "tax_amount",
      "duty_amount", "adjustment_amount", "total_amount", "snapshot", "reason",
      "created_by_type", "created_at"
    )
    SELECT "store_id", "id", "revision", "status", "payment_status",
           "fulfillment_status", "delivery_status", "return_status", "currency_code",
           "subtotal_amount", "discount_amount", "shipping_amount", "tax_amount",
           "duty_amount", "adjustment_amount", "total_amount",
           jsonb_build_object(
             'paymentCollectionId', ${event.paymentCollectionId},
             'paymentEventId', ${eventId},
             'paymentEventType', ${eventType}
           ),
           ${`Payment projection applied: ${eventType}`}, 'SYSTEM', ${event.occurredAt}::timestamptz
      FROM "orders"."orders"
     WHERE "store_id" = ${event.storeId}::uuid
       AND "id" = ${event.orderId}::uuid
  `);
  await repository.db.execute(sql`
    INSERT INTO "orders"."order_status_history" (
      "store_id", "order_id", "order_revision", "order_status", "payment_status",
      "fulfillment_status", "delivery_status", "return_status", "reason_code",
      "actor_type", "metadata", "happened_at"
    )
    SELECT "store_id", "id", "revision", "status", "payment_status",
           "fulfillment_status", "delivery_status", "return_status",
           ${eventType}, 'SYSTEM',
           jsonb_build_object('paymentCollectionId', ${event.paymentCollectionId}),
           ${event.occurredAt}::timestamptz
      FROM "orders"."orders"
     WHERE "store_id" = ${event.storeId}::uuid
       AND "id" = ${event.orderId}::uuid
  `);
  await repository.db.execute(sql`
    INSERT INTO "orders"."order_events" (
      "store_id", "order_id", "event_type", "aggregate_revision", "actor_type",
      "correlation_id", "idempotency_key", "payload", "happened_at"
    ) VALUES (
      ${event.storeId}::uuid, ${event.orderId}::uuid,
      ${eventType}, ${revision}, 'SYSTEM',
      ${uuidOrNull(correlationId)}::uuid, ${eventId}, ${JSON.stringify(event)}::jsonb,
      ${event.occurredAt}::timestamptz
    )
  `);
}

function orderPaymentStatus(state: PaymentEvents.CollectionStateChanged["state"]): string | null {
  switch (state) {
    case "OPEN":
      return null;
    case "PENDING":
      return "PENDING";
    case "PARTIALLY_AUTHORIZED":
    case "AUTHORIZED":
      return "AUTHORIZED";
    case "PARTIALLY_PAID":
      return "PARTIALLY_PAID";
    case "PAID":
      return "PAID";
    case "PARTIALLY_REFUNDED":
      return "PARTIALLY_REFUNDED";
    case "REFUNDED":
      return "REFUNDED";
    case "CANCELLED":
      return "FAILED";
  }
}

function terminalPaymentStatus(eventType: string, payload: PaymentEventPayload): string | null {
  if (eventType === "payment.failed") {
    const failed = payload as PaymentEvents.Failed;
    return failed.sessionState === "FAILED" ? "FAILED" : null;
  }
  if (eventType === "payment.cancelled") return "FAILED";
  if (eventType === "payment.expired") return "EXPIRED";
  if (eventType === "payment.voided") return "VOIDED";
  return null;
}

function uuidOrNull(value: string): string | null {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function requiredEventSequence(event: PaymentDomainEvent): number {
  if (!Number.isSafeInteger(event.eventSequence) || (event.eventSequence ?? 0) <= 0) {
    throw new Error("PAYMENT_EVENT_SEQUENCE_INVALID");
  }
  return event.eventSequence!;
}
