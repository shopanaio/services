import { and, asc, desc, eq, isNull, or, sql } from "drizzle-orm";
import { PaymentOperationTransitions, type Payments } from "@shopana/broker-types";
import { TransactionManager } from "@shopana/shared-kernel";
import { contentRevision } from "../../checkout-pipeline/canonicalJson.js";
import type { PaymentDomainEvent } from "../../contracts/ports.js";
import {
  applyProviderResult,
  applyReconcileResult,
  buildTransitionEvents,
  deriveCollection,
  zeroMoney,
} from "../../application/paymentState.js";
import type { PaymentsDatabase } from "./database.js";
import {
  paymentCollection,
  paymentDispute,
  paymentEventOutbox,
  paymentOperation,
  paymentProviderEvent,
  paymentSession,
} from "./schema.js";

function paymentLifecycleRequestHash(kind: string, value: unknown): string {
  return contentRevision(`payment-${kind}`, value);
}

export interface PreparedPaymentSession {
  duplicate: boolean;
  route: Payments.PaymentProviderRouteSnapshot;
  collection: Payments.PaymentCollectionSnapshot;
  session: Payments.PaymentSessionSnapshot;
  operation: Payments.PaymentOperationSnapshot;
  request: Payments.PaymentProviderCreatePaymentRequest;
}

export interface PreparedPaymentOperation {
  duplicate: boolean;
  route: Payments.PaymentProviderRouteSnapshot;
  collection: Payments.PaymentCollectionSnapshot;
  session: Payments.PaymentSessionSnapshot;
  operation: Payments.PaymentOperationSnapshot;
  request: Payments.PaymentProviderOperationRequest;
}

export interface PreparedPaymentConfirmation extends Omit<PreparedPaymentOperation, "request"> {
  request: Payments.PaymentProviderConfirmRequest | null;
}

export interface PendingPaymentEvent {
  id: string;
  organizationId: string;
  storeId: string;
  operationId: string | null;
  eventKey: string;
  eventType: string;
  payload: Record<string, unknown>;
  correlationId: string;
}

export class PaymentLifecycleRepository {
  private readonly tx: TransactionManager<PaymentsDatabase>;

  constructor(private readonly db: PaymentsDatabase) {
    this.tx = new TransactionManager(db);
  }

  private get connection(): PaymentsDatabase {
    return this.tx.getConnection() as PaymentsDatabase;
  }

  async createCollection(params: Payments.CreatePaymentCollectionParams) {
    return this.tx.run(async () => {
      const requestHash = paymentLifecycleRequestHash("collection", {
        organizationId: params.organizationId,
        storeId: params.storeId,
        checkoutId: params.checkoutId,
        orderId: params.orderId,
        finalQuoteRevision: params.finalQuoteRevision,
        targetAmount: params.targetAmount,
      });
      const existingRow = (
        await this.connection
          .select()
          .from(paymentCollection)
          .where(
            and(
              eq(paymentCollection.storeId, params.storeId),
              eq(paymentCollection.idempotencyKey, params.idempotencyKey),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      if (existingRow) {
        if (existingRow.requestHash !== requestHash) {
          throw new Error("PAYMENT_IDEMPOTENCY_KEY_REUSED");
        }
        return { collection: collectionSnapshot(existingRow), duplicate: true };
      }

      const now = new Date().toISOString();
      const [idRow] = await this.connection.execute<{ id: string }>(sql`SELECT uuidv7() AS id`);
      const collection: Payments.PaymentCollectionSnapshot = {
        paymentCollectionId: idRow!.id,
        organizationId: params.organizationId,
        storeId: params.storeId,
        checkoutId: params.checkoutId,
        orderId: params.orderId,
        state: "OPEN",
        targetAmount: params.targetAmount,
        authorizedAmount: zero(params.targetAmount.currencyCode),
        capturedAmount: zero(params.targetAmount.currencyCode),
        refundedAmount: zero(params.targetAmount.currencyCode),
        outstandingAmount: params.targetAmount,
        basedOnFinalQuoteRevision: params.finalQuoteRevision,
        revision: 0,
        createdAt: now,
        updatedAt: now,
      };
      await this.connection.insert(paymentCollection).values({
        id: collection.paymentCollectionId,
        organizationId: collection.organizationId,
        storeId: collection.storeId,
        checkoutId: collection.checkoutId,
        orderId: collection.orderId,
        state: collection.state,
        revision: collection.revision,
        idempotencyKey: params.idempotencyKey,
        requestHash,
        payload: collection,
        createdAt: now,
        updatedAt: now,
      });
      return { collection, duplicate: false };
    });
  }

  async prepareSession(input: {
    params: Payments.CreatePaymentSessionParams;
    binding: Payments.PaymentMethodBindingSnapshot;
    route: Payments.PaymentProviderRouteSnapshot;
    requestedAt: string;
    deadlineAt: string;
  }): Promise<PreparedPaymentSession> {
    return this.tx.run(async () => {
      const { params } = input;
      const collectionRow = (
        await this.connection
          .select()
          .from(paymentCollection)
          .where(
            and(
              eq(paymentCollection.storeId, params.storeId),
              eq(paymentCollection.id, params.paymentCollectionId),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      if (!collectionRow) throw new Error("PAYMENT_COLLECTION_NOT_FOUND");
      const collection = collectionSnapshot(collectionRow);
      assertCollectionMatches(collection, params);

      const requestHash = paymentLifecycleRequestHash("session", {
        organizationId: params.organizationId,
        storeId: params.storeId,
        checkoutId: params.checkoutId,
        orderId: params.orderId,
        paymentCollectionId: params.paymentCollectionId,
        finalQuoteRevision: params.finalQuoteRevision,
        paymentMethodsRevision: params.paymentMethodsRevision,
        methodHandle: params.methodHandle,
        kind: params.kind,
        amount: params.amount,
        expiresAt: params.expiresAt,
        returnUrl: params.returnUrl,
        customer: params.customer,
        customerInput: params.customerInput,
      });
      const existingRow = (
        await this.connection
          .select()
          .from(paymentSession)
          .where(
            and(
              eq(paymentSession.paymentCollectionId, params.paymentCollectionId),
              eq(paymentSession.idempotencyKey, params.idempotencyKey),
            ),
          )
          .limit(1)
      )[0];
      if (existingRow) {
        if (existingRow.requestHash !== requestHash) {
          throw new Error("PAYMENT_IDEMPOTENCY_KEY_REUSED");
        }
        const operationRow = (
          await this.connection
            .select()
            .from(paymentOperation)
            .where(eq(paymentOperation.paymentSessionId, existingRow.id))
            .orderBy(asc(paymentOperation.createdAt))
            .limit(1)
        )[0];
        if (!operationRow) throw new Error("PAYMENT_OPERATION_NOT_FOUND");
        const session = sessionSnapshot(existingRow);
        const operation = operationSnapshot(operationRow);
        return prepared(true, collection, session, operation, params, input.deadlineAt);
      }

      if (!["OPEN", "PARTIALLY_AUTHORIZED", "PARTIALLY_PAID"].includes(collection.state)) {
        throw new Error("PAYMENT_COLLECTION_NOT_OPEN");
      }
      const targetAmount = BigInt(collection.targetAmount.amountMinor);
      const committedAmount = BigInt(collection.authorizedAmount.amountMinor);
      const availableAmount = targetAmount > committedAmount ? targetAmount - committedAmount : 0n;
      if (
        collection.targetAmount.currencyCode !== params.amount.currencyCode ||
        BigInt(params.amount.amountMinor) <= 0n ||
        BigInt(params.amount.amountMinor) > availableAmount
      ) {
        throw new Error("PAYMENT_AMOUNT_MISMATCH");
      }

      const attempts = await this.connection
        .select({ attemptSequence: paymentSession.attemptSequence })
        .from(paymentSession)
        .where(eq(paymentSession.paymentCollectionId, collection.paymentCollectionId))
        .orderBy(asc(paymentSession.attemptSequence));
      const [ids] = await this.connection.execute<{
        sessionId: string;
        operationId: string;
      }>(sql`SELECT uuidv7() AS "sessionId", uuidv7() AS "operationId"`);
      const operationType: Payments.PaymentOperationType =
        params.kind === "SALE" ? "SALE" : "AUTHORIZE";
      const idempotency: Payments.PaymentIdempotencySnapshot = {
        scope: `payment-session:${ids!.sessionId}:initial`,
        key: params.idempotencyKey,
        requestHash,
      };
      const operation: Payments.PaymentOperationSnapshot = {
        operationId: ids!.operationId,
        paymentSessionId: ids!.sessionId,
        type: operationType,
        state: "PROCESSING",
        amount: params.amount,
        idempotency,
        route: input.route,
        providerReference: null,
        networkTransactionId: null,
        customerAction: null,
        pendingReason: null,
        pendingExpiresAt: null,
        nextReconcileAt: null,
        confirmationExpiresAt: null,
        confirmation: null,
        failure: null,
        revision: 0,
        requestedAt: input.requestedAt,
        completedAt: null,
      };
      const session: Payments.PaymentSessionSnapshot = {
        paymentSessionId: ids!.sessionId,
        paymentCollectionId: collection.paymentCollectionId,
        attemptSequence: attempts.length + 1,
        organizationId: params.organizationId,
        storeId: params.storeId,
        checkoutId: params.checkoutId,
        orderId: params.orderId,
        kind: params.kind,
        state: "PROCESSING",
        amount: params.amount,
        authorizedAmount: zero(params.amount.currencyCode),
        capturedAmount: zero(params.amount.currencyCode),
        refundedAmount: zero(params.amount.currencyCode),
        voidedAmount: zero(params.amount.currencyCode),
        method: input.binding,
        basedOnFinalQuoteRevision: params.finalQuoteRevision,
        basedOnPaymentMethodsRevision: params.paymentMethodsRevision,
        providerReference: null,
        authorizationExpiresAt: null,
        instrument: null,
        customerAction: null,
        expiresAt: params.expiresAt,
        pendingReason: null,
        pendingExpiresAt: null,
        nextReconcileAt: null,
        confirmationExpiresAt: null,
        confirmation: null,
        lastFailure: null,
        revision: 0,
        createdAt: input.requestedAt,
        updatedAt: input.requestedAt,
      };
      await this.connection.insert(paymentSession).values({
        id: session.paymentSessionId,
        paymentCollectionId: session.paymentCollectionId,
        organizationId: session.organizationId,
        storeId: session.storeId,
        checkoutId: session.checkoutId,
        orderId: session.orderId,
        attemptSequence: session.attemptSequence,
        kind: session.kind,
        state: session.state,
        providerAccountId: session.method.providerAccountId,
        methodHandle: session.method.methodHandle,
        providerReference: session.providerReference,
        revision: session.revision,
        idempotencyKey: params.idempotencyKey,
        requestHash,
        payload: session,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      });
      await this.connection.insert(paymentOperation).values({
        id: operation.operationId,
        paymentSessionId: operation.paymentSessionId,
        storeId: params.storeId,
        type: operation.type,
        state: operation.state,
        revision: operation.revision,
        idempotencyKey: params.idempotencyKey,
        requestHash,
        payload: operation,
        createdAt: operation.requestedAt,
        updatedAt: operation.requestedAt,
      });
      const previousSessionRows = await this.connection
        .select()
        .from(paymentSession)
        .where(
          and(
            eq(paymentSession.storeId, params.storeId),
            eq(paymentSession.paymentCollectionId, collection.paymentCollectionId),
          ),
        )
        .orderBy(asc(paymentSession.attemptSequence));
      const nextCollection = deriveCollection(
        collection,
        previousSessionRows.map(sessionSnapshot),
        input.requestedAt,
      );
      await this.connection
        .update(paymentCollection)
        .set({
          state: nextCollection.state,
          revision: nextCollection.revision,
          payload: nextCollection,
          updatedAt: nextCollection.updatedAt,
        })
        .where(eq(paymentCollection.id, nextCollection.paymentCollectionId));
      await this.appendEvents(
        buildTransitionEvents({
          previousCollection: collection,
          collection: nextCollection,
          previousSession: null,
          session,
          operation,
          occurredAt: input.requestedAt,
        }),
        operation,
        params.correlationId,
      );
      return prepared(false, nextCollection, session, operation, params, input.deadlineAt);
    });
  }

  async completeInitialOperation(
    preparedValue: PreparedPaymentSession,
    result: Payments.PaymentProviderOperationResult,
  ): Promise<Payments.GetPaymentSessionResult> {
    return this.tx.run(async () => {
      const currentSessionRow = (
        await this.connection
          .select()
          .from(paymentSession)
          .where(
            and(
              eq(paymentSession.storeId, preparedValue.session.storeId),
              eq(paymentSession.id, preparedValue.session.paymentSessionId),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      const currentOperationRow = (
        await this.connection
          .select()
          .from(paymentOperation)
          .where(
            and(
              eq(paymentOperation.storeId, preparedValue.session.storeId),
              eq(paymentOperation.id, preparedValue.operation.operationId),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      const currentCollectionRow = (
        await this.connection
          .select()
          .from(paymentCollection)
          .where(
            and(
              eq(paymentCollection.storeId, preparedValue.collection.storeId),
              eq(paymentCollection.id, preparedValue.collection.paymentCollectionId),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      if (!currentSessionRow || !currentOperationRow || !currentCollectionRow) {
        throw new Error("PAYMENT_OPERATION_NOT_FOUND");
      }
      const currentOperation = operationSnapshot(currentOperationRow);
      if (currentOperation.state !== "PROCESSING") {
        const operationRows = await this.connection
          .select()
          .from(paymentOperation)
          .where(
            and(
              eq(paymentOperation.storeId, preparedValue.session.storeId),
              eq(paymentOperation.paymentSessionId, preparedValue.session.paymentSessionId),
            ),
          )
          .orderBy(asc(paymentOperation.createdAt));
        return {
          session: sessionSnapshot(currentSessionRow),
          operations: operationRows.map(operationSnapshot),
        };
      }

      const completedAt = resultTimestamp(result);
      const previousSession = sessionSnapshot(currentSessionRow);
      const previousCollection = collectionSnapshot(currentCollectionRow);
      const operation = applyOperationResult(currentOperation, result, completedAt);
      const session = applyProviderResult(previousSession, operation, result, completedAt);
      await this.connection
        .update(paymentOperation)
        .set({
          state: operation.state,
          revision: operation.revision,
          payload: operation,
          updatedAt: completedAt,
        })
        .where(eq(paymentOperation.id, operation.operationId));
      await this.connection
        .update(paymentSession)
        .set({
          state: session.state,
          providerReference: session.providerReference,
          revision: session.revision,
          payload: session,
          updatedAt: completedAt,
        })
        .where(eq(paymentSession.id, session.paymentSessionId));
      const sessionRows = await this.connection
        .select()
        .from(paymentSession)
        .where(
          and(
            eq(paymentSession.storeId, session.storeId),
            eq(paymentSession.paymentCollectionId, session.paymentCollectionId),
          ),
        )
        .orderBy(asc(paymentSession.attemptSequence));
      const collection = deriveCollection(
        previousCollection,
        sessionRows.map(sessionSnapshot),
        completedAt,
      );
      await this.connection
        .update(paymentCollection)
        .set({
          state: collection.state,
          revision: collection.revision,
          payload: collection,
          updatedAt: completedAt,
        })
        .where(eq(paymentCollection.id, collection.paymentCollectionId));
      await this.appendEvents(
        buildTransitionEvents({
          previousCollection,
          collection,
          previousSession,
          session,
          operation,
          occurredAt: completedAt,
        }),
        operation,
        preparedValue.request.correlationId,
      );
      const operationRows = await this.connection
        .select()
        .from(paymentOperation)
        .where(
          and(
            eq(paymentOperation.storeId, session.storeId),
            eq(paymentOperation.paymentSessionId, session.paymentSessionId),
          ),
        )
        .orderBy(asc(paymentOperation.createdAt));
      return { session, operations: operationRows.map(operationSnapshot) };
    });
  }

  async expireSession(
    params: Payments.ExpirePaymentParams,
    effectiveAt: string,
  ): Promise<
    Readonly<{
      duplicate: boolean;
      collection: Payments.PaymentCollectionSnapshot;
      session: Payments.PaymentSessionSnapshot;
      operation: Payments.PaymentOperationSnapshot;
    }>
  > {
    return this.tx.run(async () => {
      const currentSessionRow = (
        await this.connection
          .select()
          .from(paymentSession)
          .where(
            and(
              eq(paymentSession.storeId, params.storeId),
              eq(paymentSession.id, params.paymentSessionId),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      if (!currentSessionRow) throw new Error("PAYMENT_SESSION_NOT_FOUND");

      const currentCollectionRow = (
        await this.connection
          .select()
          .from(paymentCollection)
          .where(
            and(
              eq(paymentCollection.storeId, params.storeId),
              eq(paymentCollection.id, currentSessionRow.paymentCollectionId),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      const operationRows = await this.connection
        .select()
        .from(paymentOperation)
        .where(
          and(
            eq(paymentOperation.storeId, params.storeId),
            eq(paymentOperation.paymentSessionId, params.paymentSessionId),
          ),
        )
        .orderBy(asc(paymentOperation.createdAt))
        .for("update");
      const currentOperationRow = operationRows.at(-1);
      if (!currentCollectionRow || !currentOperationRow) {
        throw new Error("PAYMENT_OPERATION_NOT_FOUND");
      }

      const currentSession = sessionSnapshot(currentSessionRow);
      const currentCollection = collectionSnapshot(currentCollectionRow);
      const currentOperation = operationSnapshot(currentOperationRow);
      if (currentSession.organizationId !== params.organizationId) {
        throw new Error("PAYMENT_ORGANIZATION_MISMATCH");
      }
      if (currentSession.state === "EXPIRED") {
        return {
          duplicate: true,
          collection: currentCollection,
          session: currentSession,
          operation: currentOperation,
        };
      }
      if (currentSession.state === "PROCESSING") {
        throw new Error("PAYMENT_OUTCOME_UNCERTAIN");
      }
      const deadline = expirationDeadline(currentSession);
      if (Date.parse(effectiveAt) < Date.parse(deadline)) {
        throw new Error("PAYMENT_SESSION_NOT_EXPIRED");
      }

      const failure: Payments.PaymentFailure = {
        category: "TIMEOUT",
        code: "PAYMENT_SESSION_EXPIRED",
        message: params.reason,
        retryable: false,
        providerCode: null,
      };
      const activeOperations = operationRows
        .map(operationSnapshot)
        .filter((candidate) => !["SUCCEEDED", "FAILED", "EXPIRED"].includes(candidate.state));
      if (activeOperations.length === 0) throw new Error("PAYMENT_OUTCOME_UNCERTAIN");
      const expiredOperations = activeOperations.map(
        (candidate): Payments.PaymentOperationSnapshot => ({
          ...candidate,
          state: "EXPIRED",
          customerAction: null,
          pendingReason: null,
          pendingExpiresAt: null,
          nextReconcileAt: null,
          confirmationExpiresAt: null,
          failure,
          revision: candidate.revision + 1,
          completedAt: effectiveAt,
        }),
      );
      const operation = expiredOperations.at(-1)!;
      const session: Payments.PaymentSessionSnapshot = {
        ...currentSession,
        state: "EXPIRED",
        customerAction: null,
        pendingReason: null,
        nextReconcileAt: null,
        lastFailure: failure,
        revision: currentSession.revision + 1,
        updatedAt: effectiveAt,
      };
      for (const expiredOperation of expiredOperations) {
        await this.connection
          .update(paymentOperation)
          .set({
            state: expiredOperation.state,
            revision: expiredOperation.revision,
            payload: expiredOperation,
            updatedAt: effectiveAt,
          })
          .where(eq(paymentOperation.id, expiredOperation.operationId));
      }
      await this.connection
        .update(paymentSession)
        .set({
          state: session.state,
          revision: session.revision,
          payload: session,
          updatedAt: effectiveAt,
        })
        .where(eq(paymentSession.id, session.paymentSessionId));
      const sessionRows = await this.connection
        .select()
        .from(paymentSession)
        .where(
          and(
            eq(paymentSession.storeId, session.storeId),
            eq(paymentSession.paymentCollectionId, session.paymentCollectionId),
          ),
        )
        .orderBy(asc(paymentSession.attemptSequence));
      const collection = deriveCollection(
        currentCollection,
        sessionRows.map(sessionSnapshot),
        effectiveAt,
      );
      await this.connection
        .update(paymentCollection)
        .set({
          state: collection.state,
          revision: collection.revision,
          payload: collection,
          updatedAt: effectiveAt,
        })
        .where(eq(paymentCollection.id, collection.paymentCollectionId));
      await this.appendEvents(
        buildTransitionEvents({
          previousCollection: currentCollection,
          collection,
          previousSession: currentSession,
          session,
          operation,
          occurredAt: effectiveAt,
          reason: params.reason,
        }),
        operation,
        params.correlationId,
      );
      return { duplicate: false, collection, session, operation };
    });
  }

  async prepareOperation(
    input: Readonly<{
      params:
        | Payments.CancelPaymentParams
        | Payments.CapturePaymentParams
        | Payments.VoidPaymentParams
        | Payments.RefundPaymentParams
        | Payments.ReconcilePaymentParams;
      type: "CANCEL" | "CAPTURE" | "VOID" | "REFUND" | "RECONCILE";
      route: Payments.PaymentProviderRouteSnapshot;
      requestedAt: string;
      deadlineAt: string;
    }>,
  ): Promise<PreparedPaymentOperation> {
    return this.tx.run(async () => {
      const { params } = input;
      const sessionRow = (
        await this.connection
          .select()
          .from(paymentSession)
          .where(
            and(
              eq(paymentSession.storeId, params.storeId),
              eq(paymentSession.id, params.paymentSessionId),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      if (!sessionRow) throw new Error("PAYMENT_SESSION_NOT_FOUND");
      const collectionRow = (
        await this.connection
          .select()
          .from(paymentCollection)
          .where(
            and(
              eq(paymentCollection.storeId, params.storeId),
              eq(paymentCollection.id, sessionRow.paymentCollectionId),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      if (!collectionRow) throw new Error("PAYMENT_COLLECTION_NOT_FOUND");
      const session = sessionSnapshot(sessionRow);
      const collection = collectionSnapshot(collectionRow);
      const normalized = {
        type: input.type,
        storeId: params.storeId,
        paymentSessionId: params.paymentSessionId,
        amount: "amount" in params ? params.amount : null,
        reason: "reason" in params ? params.reason : null,
      };
      const requestHash = paymentLifecycleRequestHash("operation", normalized);
      const existingRow = (
        await this.connection
          .select()
          .from(paymentOperation)
          .where(
            and(
              eq(paymentOperation.paymentSessionId, session.paymentSessionId),
              eq(paymentOperation.idempotencyKey, params.idempotencyKey),
            ),
          )
          .limit(1)
      )[0];
      if (existingRow) {
        if (existingRow.requestHash !== requestHash)
          throw new Error("PAYMENT_IDEMPOTENCY_KEY_REUSED");
        const operation = operationSnapshot(existingRow);
        return preparedOperation(true, collection, session, operation, params, input.deadlineAt);
      }
      const operationRows = await this.connection
        .select()
        .from(paymentOperation)
        .where(
          and(
            eq(paymentOperation.storeId, params.storeId),
            eq(paymentOperation.paymentSessionId, session.paymentSessionId),
          ),
        )
        .orderBy(asc(paymentOperation.createdAt));
      assertNoConflictingOperation(operationRows.map(operationSnapshot), input.type);
      if (!session.providerReference) throw new Error("PAYMENT_PROVIDER_REFERENCE_MISSING");
      assertOperationAllowed(session, input.type, "amount" in params ? params.amount : null);
      const [idRow] = await this.connection.execute<{ id: string }>(sql`SELECT uuidv7() AS id`);
      const amount = "amount" in params ? params.amount : zeroMoney(session.amount.currencyCode);
      const operation: Payments.PaymentOperationSnapshot = {
        operationId: idRow!.id,
        paymentSessionId: session.paymentSessionId,
        type: input.type,
        state: "PROCESSING",
        amount,
        idempotency: {
          scope: `payment-session:${session.paymentSessionId}:${input.type.toLowerCase()}`,
          key: params.idempotencyKey,
          requestHash,
        },
        route: input.route,
        providerReference: session.providerReference,
        networkTransactionId: null,
        customerAction: null,
        pendingReason: null,
        pendingExpiresAt: null,
        nextReconcileAt: null,
        confirmationExpiresAt: null,
        confirmation: null,
        failure: null,
        revision: 0,
        requestedAt: input.requestedAt,
        completedAt: null,
      };
      await this.connection.insert(paymentOperation).values({
        id: operation.operationId,
        paymentSessionId: operation.paymentSessionId,
        storeId: session.storeId,
        type: operation.type,
        state: operation.state,
        revision: operation.revision,
        idempotencyKey: params.idempotencyKey,
        requestHash,
        payload: operation,
        createdAt: operation.requestedAt,
        updatedAt: operation.requestedAt,
      });
      return preparedOperation(false, collection, session, operation, params, input.deadlineAt);
    });
  }

  async prepareConfirmation(
    input: Readonly<{
      initial: PreparedPaymentSession;
      confirmation: Payments.PaymentSettlementConfirmation;
      route: Payments.PaymentProviderRouteSnapshot;
      requestedAt: string;
      deadlineAt: string;
      correlationId: string;
    }>,
  ): Promise<PreparedPaymentConfirmation> {
    return this.tx.run(async () => {
      const sessionRow = (
        await this.connection
          .select()
          .from(paymentSession)
          .where(
            and(
              eq(paymentSession.storeId, input.initial.session.storeId),
              eq(paymentSession.id, input.initial.session.paymentSessionId),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      const collectionRow = (
        await this.connection
          .select()
          .from(paymentCollection)
          .where(
            and(
              eq(paymentCollection.storeId, input.initial.collection.storeId),
              eq(paymentCollection.id, input.initial.collection.paymentCollectionId),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      const triggeringOperationRow = (
        await this.connection
          .select()
          .from(paymentOperation)
          .where(
            and(
              eq(paymentOperation.storeId, input.initial.session.storeId),
              eq(paymentOperation.id, input.initial.operation.operationId),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      if (!sessionRow || !collectionRow || !triggeringOperationRow) {
        throw new Error("PAYMENT_SESSION_NOT_FOUND");
      }
      const previousSession = sessionSnapshot(sessionRow);
      const previousCollection = collectionSnapshot(collectionRow);
      const triggeringOperation = operationSnapshot(triggeringOperationRow);
      const idempotencyKey = `confirmation:${input.confirmation.confirmationId}`;
      const requestHash = paymentLifecycleRequestHash("confirmation", {
        paymentSessionId: previousSession.paymentSessionId,
        triggeringOperationId: input.initial.operation.operationId,
        confirmation: input.confirmation,
      });
      const existingRow = (
        await this.connection
          .select()
          .from(paymentOperation)
          .where(
            and(
              eq(paymentOperation.paymentSessionId, previousSession.paymentSessionId),
              eq(paymentOperation.idempotencyKey, idempotencyKey),
            ),
          )
          .limit(1)
      )[0];
      if (existingRow) {
        if (existingRow.requestHash !== requestHash)
          throw new Error("PAYMENT_IDEMPOTENCY_KEY_REUSED");
        const operation = operationSnapshot(existingRow);
        const session = sessionSnapshot(sessionRow);
        return preparedConfirmation(true, previousCollection, session, operation, input);
      }
      if (
        previousSession.state !== "REQUIRES_CONFIRMATION" ||
        !previousSession.providerReference ||
        triggeringOperation.state !== "REQUIRES_CONFIRMATION"
      ) {
        throw new Error("PAYMENT_CONFIRMATION_NOT_REQUIRED");
      }
      assertSettlementConfirmation(input.confirmation, previousSession, input.requestedAt);
      const completedTriggeringOperation: Payments.PaymentOperationSnapshot = {
        ...triggeringOperation,
        state: "SUCCEEDED",
        confirmationExpiresAt: null,
        revision: triggeringOperation.revision + 1,
        completedAt: input.requestedAt,
      };
      const [idRow] = await this.connection.execute<{ id: string }>(sql`SELECT uuidv7() AS id`);
      const rejected = input.confirmation.decision === "REJECTED";
      const operation: Payments.PaymentOperationSnapshot = {
        operationId: idRow!.id,
        paymentSessionId: previousSession.paymentSessionId,
        type: "CONFIRM",
        state: rejected ? "FAILED" : "PROCESSING",
        amount: previousSession.amount,
        idempotency: {
          scope: `payment-session:${previousSession.paymentSessionId}:confirmation`,
          key: idempotencyKey,
          requestHash,
        },
        route: input.route,
        providerReference: previousSession.providerReference,
        networkTransactionId: null,
        customerAction: null,
        pendingReason: null,
        pendingExpiresAt: null,
        nextReconcileAt: null,
        confirmationExpiresAt: null,
        confirmation: input.confirmation,
        failure: rejected ? input.confirmation.failure : null,
        revision: rejected ? 1 : 0,
        requestedAt: input.requestedAt,
        completedAt: rejected ? input.requestedAt : null,
      };
      const session: Payments.PaymentSessionSnapshot = {
        ...previousSession,
        state: rejected ? "FAILED" : "PROCESSING",
        confirmation: input.confirmation,
        confirmationExpiresAt: null,
        lastFailure: rejected ? input.confirmation.failure : previousSession.lastFailure,
        revision: previousSession.revision + 1,
        updatedAt: input.requestedAt,
      };
      await this.connection.insert(paymentOperation).values({
        id: operation.operationId,
        paymentSessionId: operation.paymentSessionId,
        storeId: session.storeId,
        type: operation.type,
        state: operation.state,
        revision: operation.revision,
        idempotencyKey,
        requestHash,
        payload: operation,
        createdAt: operation.requestedAt,
        updatedAt: input.requestedAt,
      });
      await this.connection
        .update(paymentOperation)
        .set({
          state: completedTriggeringOperation.state,
          revision: completedTriggeringOperation.revision,
          payload: completedTriggeringOperation,
          updatedAt: input.requestedAt,
        })
        .where(eq(paymentOperation.id, completedTriggeringOperation.operationId));
      await this.connection
        .update(paymentSession)
        .set({
          state: session.state,
          revision: session.revision,
          payload: session,
          updatedAt: session.updatedAt,
        })
        .where(eq(paymentSession.id, session.paymentSessionId));
      const sessionRows = await this.connection
        .select()
        .from(paymentSession)
        .where(
          and(
            eq(paymentSession.storeId, session.storeId),
            eq(paymentSession.paymentCollectionId, session.paymentCollectionId),
          ),
        )
        .orderBy(asc(paymentSession.attemptSequence));
      const collection = rejected
        ? deriveCollection(previousCollection, sessionRows.map(sessionSnapshot), input.requestedAt)
        : previousCollection;
      if (rejected) {
        await this.connection
          .update(paymentCollection)
          .set({
            state: collection.state,
            revision: collection.revision,
            payload: collection,
            updatedAt: collection.updatedAt,
          })
          .where(eq(paymentCollection.id, collection.paymentCollectionId));
      }
      await this.appendEvents(
        buildTransitionEvents({
          previousCollection,
          collection,
          previousSession,
          session,
          operation,
          occurredAt: input.requestedAt,
        }),
        operation,
        input.correlationId,
      );
      return preparedConfirmation(false, collection, session, operation, input);
    });
  }

  async completePreparedOperation(
    preparedValue: PreparedPaymentOperation,
    result: Payments.PaymentProviderOperationResult | Payments.PaymentProviderReconcileResult,
  ): Promise<Payments.CompleteProviderOperationResult> {
    return this.completeOperation({
      storeId: preparedValue.session.storeId,
      paymentSessionId: preparedValue.session.paymentSessionId,
      operationId: preparedValue.operation.operationId,
      result,
      providerEvent: null,
      correlationId: preparedValue.request.correlationId,
    });
  }

  async applyOperationSettlement(
    preparedValue: PreparedPaymentOperation,
    confirmation: Payments.PaymentSettlementConfirmation,
    updatedAt: string,
  ): Promise<PreparedPaymentOperation> {
    return this.tx.run(async () => {
      const sessionRow = (
        await this.connection
          .select()
          .from(paymentSession)
          .where(
            and(
              eq(paymentSession.storeId, preparedValue.session.storeId),
              eq(paymentSession.id, preparedValue.session.paymentSessionId),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      const operationRow = (
        await this.connection
          .select()
          .from(paymentOperation)
          .where(
            and(
              eq(paymentOperation.storeId, preparedValue.session.storeId),
              eq(paymentOperation.id, preparedValue.operation.operationId),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      if (!sessionRow || !operationRow) throw new Error("PAYMENT_OPERATION_NOT_FOUND");
      const previousSession = sessionSnapshot(sessionRow);
      const currentOperation = operationSnapshot(operationRow);
      if (currentOperation.confirmation?.confirmationId === confirmation.confirmationId) {
        return {
          ...preparedValue,
          session: previousSession,
          operation: currentOperation,
        };
      }
      assertSettlementConfirmation(confirmation, previousSession, updatedAt);
      if (currentOperation.state !== "PROCESSING") {
        throw new Error("PAYMENT_OPERATION_NOT_PROCESSING");
      }
      const rejected = confirmation.decision === "REJECTED";
      const operation: Payments.PaymentOperationSnapshot = {
        ...currentOperation,
        state: rejected ? "FAILED" : currentOperation.state,
        confirmation,
        failure: rejected ? confirmation.failure : currentOperation.failure,
        revision: currentOperation.revision + 1,
        completedAt: rejected ? updatedAt : currentOperation.completedAt,
      };
      const session: Payments.PaymentSessionSnapshot = {
        ...previousSession,
        confirmation,
        lastFailure: rejected ? confirmation.failure : previousSession.lastFailure,
        revision: previousSession.revision + 1,
        updatedAt,
      };
      await this.connection
        .update(paymentOperation)
        .set({
          state: operation.state,
          revision: operation.revision,
          payload: operation,
          updatedAt,
        })
        .where(eq(paymentOperation.id, operation.operationId));
      await this.connection
        .update(paymentSession)
        .set({
          revision: session.revision,
          payload: session,
          updatedAt,
        })
        .where(eq(paymentSession.id, session.paymentSessionId));
      await this.appendEvents(
        buildTransitionEvents({
          previousCollection: preparedValue.collection,
          collection: preparedValue.collection,
          previousSession,
          session,
          operation,
          occurredAt: updatedAt,
        }),
        operation,
        preparedValue.request.correlationId,
      );
      return { ...preparedValue, session, operation };
    });
  }

  async completeOperation(
    input: Readonly<{
      storeId: string;
      paymentSessionId: string;
      operationId: string;
      result: Payments.PaymentProviderOperationResult | Payments.PaymentProviderReconcileResult;
      providerEvent: Readonly<{
        providerAccountId: string;
        providerEventId: string;
        eventHash: string;
        occurredAt: string;
        payload: Record<string, unknown>;
      }> | null;
      correlationId: string;
    }>,
  ): Promise<Payments.CompleteProviderOperationResult> {
    return this.tx.run(async () => {
      const sessionRow = (
        await this.connection
          .select()
          .from(paymentSession)
          .where(
            and(
              eq(paymentSession.storeId, input.storeId),
              eq(paymentSession.id, input.paymentSessionId),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      const operationRow = (
        await this.connection
          .select()
          .from(paymentOperation)
          .where(
            and(
              eq(paymentOperation.storeId, input.storeId),
              eq(paymentOperation.id, input.operationId),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      if (!sessionRow || !operationRow) throw new Error("PAYMENT_OPERATION_NOT_FOUND");
      const collectionRow = (
        await this.connection
          .select()
          .from(paymentCollection)
          .where(
            and(
              eq(paymentCollection.storeId, input.storeId),
              eq(paymentCollection.id, sessionRow.paymentCollectionId),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      if (!collectionRow) throw new Error("PAYMENT_COLLECTION_NOT_FOUND");
      const previousSession = sessionSnapshot(sessionRow);
      const previousCollection = collectionSnapshot(collectionRow);
      const currentOperation = operationSnapshot(operationRow);
      if (currentOperation.paymentSessionId !== previousSession.paymentSessionId) {
        throw new Error("PAYMENT_OPERATION_SESSION_MISMATCH");
      }

      if (input.providerEvent) {
        const inbox = await this.recordProviderEvent(input.providerEvent, input.storeId);
        if (inbox === "CONFLICT") throw new Error("PAYMENT_PROVIDER_EVENT_ID_REUSED");
        if (inbox === "DUPLICATE") {
          return {
            accepted: true,
            duplicate: true,
            collectionRevision: previousCollection.revision,
            sessionRevision: previousSession.revision,
          };
        }
      }
      if (["SUCCEEDED", "FAILED", "EXPIRED"].includes(currentOperation.state)) {
        assertTerminalCompletionCompatible(currentOperation, input.result);
        return {
          accepted: true,
          duplicate: true,
          collectionRevision: previousCollection.revision,
          sessionRevision: previousSession.revision,
        };
      }
      const latestOperationRow = (
        await this.connection
          .select()
          .from(paymentOperation)
          .where(
            and(
              eq(paymentOperation.storeId, input.storeId),
              eq(paymentOperation.paymentSessionId, previousSession.paymentSessionId),
            ),
          )
          .orderBy(desc(paymentOperation.createdAt), desc(paymentOperation.id))
          .limit(1)
          .for("update")
      )[0];
      if (
        latestOperationRow &&
        latestOperationRow.id !== currentOperation.operationId &&
        ["CANCELLED", "VOIDED", "REFUNDED", "EXPIRED"].includes(previousSession.state)
      ) {
        return {
          accepted: true,
          duplicate: true,
          collectionRevision: previousCollection.revision,
          sessionRevision: previousSession.revision,
        };
      }
      const observedAt = isReconcileResult(input.result)
        ? input.result.observedAt
        : resultTimestamp(input.result);
      assertProviderResultReference(previousSession, input.result);
      if (
        latestOperationRow &&
        latestOperationRow.id !== currentOperation.operationId &&
        Date.parse(observedAt) < Date.parse(previousSession.updatedAt)
      ) {
        const staleOperation = isReconcileResult(input.result)
          ? applyReconcileOperationResult(currentOperation, input.result)
          : applyOperationResult(currentOperation, input.result, observedAt);
        await this.connection
          .update(paymentOperation)
          .set({
            state: staleOperation.state,
            revision: staleOperation.revision,
            payload: staleOperation,
            updatedAt: observedAt,
          })
          .where(eq(paymentOperation.id, staleOperation.operationId));
        return {
          accepted: true,
          duplicate: true,
          collectionRevision: previousCollection.revision,
          sessionRevision: previousSession.revision,
        };
      }
      const operation = isReconcileResult(input.result)
        ? applyReconcileOperationResult(currentOperation, input.result)
        : applyOperationResult(currentOperation, input.result, observedAt);
      const session = isReconcileResult(input.result)
        ? applyReconcileResult(previousSession, input.result)
        : applyProviderResult(previousSession, operation, input.result, observedAt);
      await this.connection
        .update(paymentOperation)
        .set({
          state: operation.state,
          revision: operation.revision,
          payload: operation,
          updatedAt: observedAt,
        })
        .where(eq(paymentOperation.id, operation.operationId));
      await this.connection
        .update(paymentSession)
        .set({
          state: session.state,
          providerReference: session.providerReference,
          revision: session.revision,
          payload: session,
          updatedAt: observedAt,
        })
        .where(eq(paymentSession.id, session.paymentSessionId));
      if (operation.type === "CANCEL" && operation.state === "SUCCEEDED") {
        await this.closeCancelledOperations(previousSession, operation.operationId, observedAt);
      }
      if (isReconcileResult(input.result) && input.result.state === "PENDING") {
        await this.reschedulePendingOperations(
          previousSession,
          operation.operationId,
          input.result,
        );
      }
      const supersededFailures =
        isReconcileResult(input.result) && input.result.state !== "PENDING"
          ? await this.settleSupersededOperations(
              previousSession,
              input.result,
              operation.operationId,
            )
          : [];
      const sessionRows = await this.connection
        .select()
        .from(paymentSession)
        .where(
          and(
            eq(paymentSession.storeId, session.storeId),
            eq(paymentSession.paymentCollectionId, session.paymentCollectionId),
          ),
        )
        .orderBy(asc(paymentSession.attemptSequence));
      const collection = deriveCollection(
        previousCollection,
        sessionRows.map(sessionSnapshot),
        observedAt,
      );
      await this.connection
        .update(paymentCollection)
        .set({
          state: collection.state,
          revision: collection.revision,
          payload: collection,
          updatedAt: observedAt,
        })
        .where(eq(paymentCollection.id, collection.paymentCollectionId));
      await this.appendEvents(
        buildTransitionEvents({
          previousCollection,
          collection,
          previousSession,
          session,
          operation,
          occurredAt: observedAt,
        }),
        operation,
        input.correlationId,
      );
      for (const failedOperation of supersededFailures) {
        await this.appendEvents(
          buildTransitionEvents({
            previousCollection: collection,
            collection,
            previousSession: session,
            session,
            operation: failedOperation,
            occurredAt: observedAt,
          }),
          failedOperation,
          input.correlationId,
        );
      }
      return {
        accepted: true,
        duplicate: false,
        collectionRevision: collection.revision,
        sessionRevision: session.revision,
      };
    });
  }

  async reportProviderEvent(
    input: Readonly<{
      params: Payments.ReportPaymentProviderEventParams;
      account: Payments.PaymentProviderAccountSnapshot;
      route: Payments.PaymentProviderRouteSnapshot;
      eventHash: string;
      correlationId: string;
    }>,
  ): Promise<Payments.ReportPaymentProviderEventResult> {
    return this.tx.run(async () => {
      const inbox = await this.recordProviderEvent(
        {
          providerAccountId: input.account.providerAccountId,
          providerEventId: input.params.providerEventId,
          eventHash: input.eventHash,
          occurredAt: input.params.occurredAt,
          payload: input.params as unknown as Record<string, unknown>,
        },
        input.account.storeId,
      );
      if (inbox === "CONFLICT") throw new Error("PAYMENT_PROVIDER_EVENT_ID_REUSED");
      const providerReference =
        input.params.event.type === "PAYMENT_RECONCILED"
          ? input.params.event.result.providerReference
          : input.params.event.providerReference;
      const sessionRow = (
        await this.connection
          .select()
          .from(paymentSession)
          .where(
            and(
              eq(paymentSession.storeId, input.account.storeId),
              eq(paymentSession.providerAccountId, input.account.providerAccountId),
              eq(paymentSession.providerReference, providerReference),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      if (!sessionRow) throw new Error("PAYMENT_SESSION_NOT_FOUND");
      const session = sessionSnapshot(sessionRow);
      const collectionRow = (
        await this.connection
          .select()
          .from(paymentCollection)
          .where(
            and(
              eq(paymentCollection.storeId, session.storeId),
              eq(paymentCollection.id, session.paymentCollectionId),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      if (!collectionRow) throw new Error("PAYMENT_COLLECTION_NOT_FOUND");
      const collection = collectionSnapshot(collectionRow);
      if (inbox === "DUPLICATE") {
        return {
          accepted: true,
          duplicate: true,
          paymentSessionId: session.paymentSessionId,
          collectionRevision: collection.revision,
          sessionRevision: session.revision,
        };
      }

      if (input.params.event.type === "DISPUTE_CHANGED") {
        const event = input.params.event;
        const disputedAmount = BigInt(event.amount.amountMinor);
        if (event.amount.currencyCode !== session.amount.currencyCode) {
          throw new Error("PAYMENT_CURRENCY_MISMATCH");
        }
        if (disputedAmount <= 0n || disputedAmount > BigInt(session.capturedAmount.amountMinor)) {
          throw new Error("PAYMENT_DISPUTE_AMOUNT_INVALID");
        }
        const existingRow = (
          await this.connection
            .select()
            .from(paymentDispute)
            .where(
              and(
                eq(paymentDispute.storeId, session.storeId),
                eq(paymentDispute.providerAccountId, input.account.providerAccountId),
                eq(paymentDispute.providerDisputeReference, event.providerDisputeReference),
              ),
            )
            .limit(1)
            .for("update")
        )[0];
        let newDisputeId: string | null = null;
        if (!existingRow) {
          const [idRow] = await this.connection.execute<{ id: string }>(sql`SELECT uuidv7() AS id`);
          newDisputeId = idRow!.id;
        }
        const previous = existingRow ? disputeSnapshot(existingRow) : null;
        if (
          previous &&
          (previous.paymentSessionId !== session.paymentSessionId ||
            previous.providerReference !== event.providerReference ||
            previous.providerAccountId !== input.account.providerAccountId)
        ) {
          throw new Error("PAYMENT_DISPUTE_IDENTITY_CONFLICT");
        }
        if (previous && Date.parse(input.params.occurredAt) < Date.parse(previous.updatedAt)) {
          return {
            accepted: true,
            duplicate: true,
            paymentSessionId: session.paymentSessionId,
            collectionRevision: collection.revision,
            sessionRevision: session.revision,
          };
        }
        const dispute: Payments.PaymentDisputeSnapshot = {
          paymentDisputeId: previous?.paymentDisputeId ?? newDisputeId!,
          paymentCollectionId: session.paymentCollectionId,
          paymentSessionId: session.paymentSessionId,
          providerAccountId: input.account.providerAccountId,
          providerDisputeReference: event.providerDisputeReference,
          providerReference: event.providerReference,
          amount: event.amount,
          reasonCode: event.reasonCode,
          state: event.state,
          responseDueAt: event.responseDueAt,
          revision: (previous?.revision ?? -1) + 1,
          openedAt: previous?.openedAt ?? input.params.occurredAt,
          updatedAt: input.params.occurredAt,
        };
        const values = {
          storeId: session.storeId,
          paymentCollectionId: dispute.paymentCollectionId,
          paymentSessionId: dispute.paymentSessionId,
          providerAccountId: dispute.providerAccountId,
          providerDisputeReference: dispute.providerDisputeReference,
          providerReference: dispute.providerReference,
          state: dispute.state,
          revision: dispute.revision,
          payload: dispute,
          openedAt: dispute.openedAt,
          updatedAt: dispute.updatedAt,
        };
        if (existingRow) {
          await this.connection
            .update(paymentDispute)
            .set(values)
            .where(eq(paymentDispute.id, existingRow.id));
        } else {
          await this.connection
            .insert(paymentDispute)
            .values({ id: dispute.paymentDisputeId, ...values });
        }
        const payload = {
          schemaVersion: 1 as const,
          paymentDisputeId: dispute.paymentDisputeId,
          paymentCollectionId: dispute.paymentCollectionId,
          paymentSessionId: dispute.paymentSessionId,
          organizationId: session.organizationId,
          storeId: session.storeId,
          orderId: session.orderId,
          providerCode: session.method.providerCode,
          providerDisputeReference: dispute.providerDisputeReference,
          providerReference: dispute.providerReference,
          amount: dispute.amount,
          reasonCode: dispute.reasonCode,
          previousState: previous?.state ?? null,
          state: dispute.state,
          responseDueAt: dispute.responseDueAt,
          disputeRevision: dispute.revision,
          occurredAt: input.params.occurredAt,
        };
        await this.connection
          .insert(paymentEventOutbox)
          .values({
            organizationId: session.organizationId,
            storeId: session.storeId,
            operationId: null,
            eventKey: `provider-event:${input.params.providerEventId}:payment.dispute.changed`,
            eventType: "payment.dispute.changed",
            payload,
            correlationId: input.correlationId,
          })
          .onConflictDoNothing();
        return {
          accepted: true,
          duplicate: false,
          paymentSessionId: session.paymentSessionId,
          collectionRevision: collection.revision,
          sessionRevision: session.revision,
        };
      }

      const result = input.params.event.result;
      if (Date.parse(result.observedAt) < Date.parse(session.updatedAt)) {
        return {
          accepted: true,
          duplicate: true,
          paymentSessionId: session.paymentSessionId,
          collectionRevision: collection.revision,
          sessionRevision: session.revision,
        };
      }
      const [operationId] = await this.connection.execute<{ id: string }>(
        sql`SELECT uuidv7() AS id`,
      );
      const operation: Payments.PaymentOperationSnapshot = {
        operationId: operationId!.id,
        paymentSessionId: session.paymentSessionId,
        type: "RECONCILE",
        state: "SUCCEEDED",
        amount: zeroMoney(session.amount.currencyCode),
        idempotency: {
          scope: `payment-session:${session.paymentSessionId}:provider-event`,
          key: input.params.providerEventId,
          requestHash: input.eventHash,
        },
        route: input.route,
        providerReference: result.providerReference,
        networkTransactionId: result.networkTransactionId,
        customerAction: null,
        pendingReason: result.pendingReason,
        pendingExpiresAt: result.pendingExpiresAt,
        nextReconcileAt: null,
        confirmationExpiresAt: null,
        confirmation: null,
        failure: null,
        revision: 1,
        requestedAt: input.params.occurredAt,
        completedAt: result.observedAt,
      };
      const nextSession = applyReconcileResult(session, result);
      await this.connection.insert(paymentOperation).values({
        id: operation.operationId,
        paymentSessionId: operation.paymentSessionId,
        storeId: session.storeId,
        type: operation.type,
        state: operation.state,
        revision: operation.revision,
        idempotencyKey: operation.idempotency.key,
        requestHash: operation.idempotency.requestHash,
        payload: operation,
        createdAt: operation.requestedAt,
        updatedAt: operation.completedAt!,
      });
      await this.connection
        .update(paymentSession)
        .set({
          state: nextSession.state,
          providerReference: nextSession.providerReference,
          revision: nextSession.revision,
          payload: nextSession,
          updatedAt: nextSession.updatedAt,
        })
        .where(eq(paymentSession.id, nextSession.paymentSessionId));
      if (result.state === "PENDING") {
        await this.reschedulePendingOperations(session, operation.operationId, result);
      }
      const supersededFailures =
        result.state !== "PENDING"
          ? await this.settleSupersededOperations(session, result, operation.operationId)
          : [];
      const sessionRows = await this.connection
        .select()
        .from(paymentSession)
        .where(
          and(
            eq(paymentSession.storeId, session.storeId),
            eq(paymentSession.paymentCollectionId, session.paymentCollectionId),
          ),
        )
        .orderBy(asc(paymentSession.attemptSequence));
      const nextCollection = deriveCollection(
        collection,
        sessionRows.map(sessionSnapshot),
        result.observedAt,
      );
      await this.connection
        .update(paymentCollection)
        .set({
          state: nextCollection.state,
          revision: nextCollection.revision,
          payload: nextCollection,
          updatedAt: nextCollection.updatedAt,
        })
        .where(eq(paymentCollection.id, nextCollection.paymentCollectionId));
      await this.appendEvents(
        buildTransitionEvents({
          previousCollection: collection,
          collection: nextCollection,
          previousSession: session,
          session: nextSession,
          operation,
          occurredAt: result.observedAt,
        }),
        operation,
        input.correlationId,
      );
      for (const failedOperation of supersededFailures) {
        await this.appendEvents(
          buildTransitionEvents({
            previousCollection: nextCollection,
            collection: nextCollection,
            previousSession: nextSession,
            session: nextSession,
            operation: failedOperation,
            occurredAt: result.observedAt,
          }),
          failedOperation,
          input.correlationId,
        );
      }
      return {
        accepted: true,
        duplicate: false,
        paymentSessionId: session.paymentSessionId,
        collectionRevision: nextCollection.revision,
        sessionRevision: nextSession.revision,
      };
    });
  }

  async getProviderCompletionExpectation(
    storeId: string,
    paymentSessionId: string,
    operationId: string,
  ) {
    const sessionRow = (
      await this.db
        .select()
        .from(paymentSession)
        .where(and(eq(paymentSession.storeId, storeId), eq(paymentSession.id, paymentSessionId)))
        .limit(1)
    )[0];
    const operationRow = (
      await this.db
        .select()
        .from(paymentOperation)
        .where(and(eq(paymentOperation.storeId, storeId), eq(paymentOperation.id, operationId)))
        .limit(1)
    )[0];
    if (!sessionRow || !operationRow) throw new Error("PAYMENT_OPERATION_NOT_FOUND");
    return { session: sessionSnapshot(sessionRow), operation: operationSnapshot(operationRow) };
  }

  async failPendingOperation(
    input: Readonly<{
      storeId: string;
      paymentSessionId: string;
      operationId: string;
      expiresAt: string;
      effectiveAt: string;
      correlationId: string;
    }>,
  ): Promise<
    Readonly<{
      duplicate: boolean;
      session: Payments.PaymentSessionSnapshot;
      operation: Payments.PaymentOperationSnapshot;
    }>
  > {
    return this.tx.run(async () => {
      const sessionRow = (
        await this.connection
          .select()
          .from(paymentSession)
          .where(
            and(
              eq(paymentSession.storeId, input.storeId),
              eq(paymentSession.id, input.paymentSessionId),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      const operationRow = (
        await this.connection
          .select()
          .from(paymentOperation)
          .where(
            and(
              eq(paymentOperation.storeId, input.storeId),
              eq(paymentOperation.id, input.operationId),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      if (!sessionRow || !operationRow) throw new Error("PAYMENT_OPERATION_NOT_FOUND");
      const previousSession = sessionSnapshot(sessionRow);
      const currentOperation = operationSnapshot(operationRow);
      if (currentOperation.paymentSessionId !== previousSession.paymentSessionId) {
        throw new Error("PAYMENT_OPERATION_SESSION_MISMATCH");
      }
      if (["SUCCEEDED", "FAILED", "EXPIRED"].includes(currentOperation.state)) {
        return { duplicate: true, session: previousSession, operation: currentOperation };
      }
      if (
        !["PENDING", "REQUIRES_ACTION", "REQUIRES_CONFIRMATION"].includes(currentOperation.state)
      ) {
        throw new Error("PAYMENT_OPERATION_NOT_PENDING");
      }
      const persistedExpiry =
        currentOperation.pendingExpiresAt ??
        currentOperation.customerAction?.expiresAt ??
        currentOperation.confirmationExpiresAt;
      if (persistedExpiry !== input.expiresAt) {
        throw new Error("PAYMENT_OPERATION_EXPIRY_MISMATCH");
      }
      if (Date.parse(input.effectiveAt) < Date.parse(input.expiresAt)) {
        throw new Error("PAYMENT_OPERATION_NOT_EXPIRED");
      }
      const collectionRow = (
        await this.connection
          .select()
          .from(paymentCollection)
          .where(
            and(
              eq(paymentCollection.storeId, input.storeId),
              eq(paymentCollection.id, previousSession.paymentCollectionId),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      if (!collectionRow) throw new Error("PAYMENT_COLLECTION_NOT_FOUND");
      const previousCollection = collectionSnapshot(collectionRow);
      const failure: Payments.PaymentFailure = {
        category: "TIMEOUT",
        code: "PAYMENT_PROVIDER_OPERATION_EXPIRED",
        message: "The payment provider operation did not complete before its deadline.",
        retryable: true,
        providerCode: null,
      };
      const operation: Payments.PaymentOperationSnapshot = {
        ...currentOperation,
        state: "FAILED",
        customerAction: null,
        pendingReason: null,
        pendingExpiresAt: null,
        nextReconcileAt: null,
        confirmationExpiresAt: null,
        failure,
        revision: currentOperation.revision + 1,
        completedAt: input.effectiveAt,
      };
      const session: Payments.PaymentSessionSnapshot = {
        ...previousSession,
        lastFailure: failure,
        revision: previousSession.revision + 1,
        updatedAt: input.effectiveAt,
      };
      await this.connection
        .update(paymentOperation)
        .set({
          state: operation.state,
          revision: operation.revision,
          payload: operation,
          updatedAt: input.effectiveAt,
        })
        .where(eq(paymentOperation.id, operation.operationId));
      await this.connection
        .update(paymentSession)
        .set({
          revision: session.revision,
          payload: session,
          updatedAt: input.effectiveAt,
        })
        .where(eq(paymentSession.id, session.paymentSessionId));
      const sessionRows = await this.connection
        .select()
        .from(paymentSession)
        .where(
          and(
            eq(paymentSession.storeId, session.storeId),
            eq(paymentSession.paymentCollectionId, session.paymentCollectionId),
          ),
        )
        .orderBy(asc(paymentSession.attemptSequence));
      const collection = deriveCollection(
        previousCollection,
        sessionRows.map(sessionSnapshot),
        input.effectiveAt,
      );
      await this.connection
        .update(paymentCollection)
        .set({
          state: collection.state,
          revision: collection.revision,
          payload: collection,
          updatedAt: collection.updatedAt,
        })
        .where(eq(paymentCollection.id, collection.paymentCollectionId));
      await this.appendEvents(
        buildTransitionEvents({
          previousCollection,
          collection,
          previousSession,
          session,
          operation,
          occurredAt: input.effectiveAt,
        }),
        operation,
        input.correlationId,
      );
      return { duplicate: false, session, operation };
    });
  }

  async listPendingEvents(operationId: string): Promise<readonly PendingPaymentEvent[]> {
    const rows = await this.db
      .select()
      .from(paymentEventOutbox)
      .where(
        and(eq(paymentEventOutbox.operationId, operationId), isNull(paymentEventOutbox.emittedAt)),
      )
      .orderBy(asc(paymentEventOutbox.createdAt), asc(paymentEventOutbox.id));
    return rows.map((row) => ({
      id: row.id,
      organizationId: row.organizationId,
      storeId: row.storeId,
      operationId: row.operationId,
      eventKey: row.eventKey,
      eventType: row.eventType,
      payload: row.payload as Record<string, unknown>,
      correlationId: row.correlationId,
    }));
  }

  async listPendingProviderEventEvents(
    providerEventId: string,
  ): Promise<readonly PendingPaymentEvent[]> {
    const rows = await this.db
      .select({ outbox: paymentEventOutbox })
      .from(paymentEventOutbox)
      .leftJoin(paymentOperation, eq(paymentOperation.id, paymentEventOutbox.operationId))
      .where(
        and(
          isNull(paymentEventOutbox.emittedAt),
          or(
            eq(
              paymentEventOutbox.eventKey,
              `provider-event:${providerEventId}:payment.dispute.changed`,
            ),
            eq(paymentOperation.idempotencyKey, providerEventId),
          ),
        ),
      );
    return rows.map(({ outbox: row }) => ({
      id: row.id,
      organizationId: row.organizationId,
      storeId: row.storeId,
      operationId: row.operationId,
      eventKey: row.eventKey,
      eventType: row.eventType,
      payload: row.payload as Record<string, unknown>,
      correlationId: row.correlationId,
    }));
  }

  async markEventEmitted(id: string, emittedAt: string): Promise<void> {
    await this.db
      .update(paymentEventOutbox)
      .set({ emittedAt })
      .where(and(eq(paymentEventOutbox.id, id), isNull(paymentEventOutbox.emittedAt)));
  }

  async getCollection(
    params: Payments.GetPaymentCollectionParams,
  ): Promise<Payments.GetPaymentCollectionResult> {
    const row = (
      await this.db
        .select()
        .from(paymentCollection)
        .where(
          and(
            eq(paymentCollection.storeId, params.storeId),
            eq(paymentCollection.id, params.paymentCollectionId),
          ),
        )
        .limit(1)
    )[0];
    if (!row) throw new Error("PAYMENT_COLLECTION_NOT_FOUND");
    const sessionRows = await this.db
      .select()
      .from(paymentSession)
      .where(
        and(
          eq(paymentSession.storeId, params.storeId),
          eq(paymentSession.paymentCollectionId, params.paymentCollectionId),
        ),
      )
      .orderBy(asc(paymentSession.attemptSequence));
    return { collection: collectionSnapshot(row), sessions: sessionRows.map(sessionSnapshot) };
  }

  async getSession(
    params: Payments.GetPaymentSessionParams,
  ): Promise<Payments.GetPaymentSessionResult> {
    const row = (
      await this.db
        .select()
        .from(paymentSession)
        .where(
          and(
            eq(paymentSession.storeId, params.storeId),
            eq(paymentSession.id, params.paymentSessionId),
          ),
        )
        .limit(1)
    )[0];
    if (!row) throw new Error("PAYMENT_SESSION_NOT_FOUND");
    const operationRows = await this.db
      .select()
      .from(paymentOperation)
      .where(
        and(
          eq(paymentOperation.storeId, params.storeId),
          eq(paymentOperation.paymentSessionId, params.paymentSessionId),
        ),
      )
      .orderBy(asc(paymentOperation.createdAt));
    return { session: sessionSnapshot(row), operations: operationRows.map(operationSnapshot) };
  }

  private async appendEvents(
    events: readonly PaymentDomainEvent[],
    operation: Payments.PaymentOperationSnapshot,
    correlationId: string,
  ): Promise<void> {
    if (events.length === 0) return;
    await this.connection
      .insert(paymentEventOutbox)
      .values(
        events.map((event) => ({
          organizationId: event.payload.organizationId,
          storeId: event.payload.storeId,
          operationId: operation.operationId,
          eventKey: `${operation.operationId}:${operation.revision}:${event.type}`,
          eventType: event.type,
          payload: event.payload,
          correlationId,
        })),
      )
      .onConflictDoNothing();
  }

  private async settleSupersededOperations(
    previousSession: Payments.PaymentSessionSnapshot,
    result: Payments.PaymentProviderReconcileResult,
    reconciliationOperationId: string,
  ): Promise<readonly Payments.PaymentOperationSnapshot[]> {
    const failures: Payments.PaymentOperationSnapshot[] = [];
    const rows = await this.connection
      .select()
      .from(paymentOperation)
      .where(
        and(
          eq(paymentOperation.storeId, previousSession.storeId),
          eq(paymentOperation.paymentSessionId, previousSession.paymentSessionId),
        ),
      )
      .orderBy(asc(paymentOperation.createdAt))
      .for("update");
    for (const row of rows) {
      const current = operationSnapshot(row);
      if (
        current.operationId === reconciliationOperationId ||
        ![
          "REQUESTED",
          "PROCESSING",
          "REQUIRES_ACTION",
          "REQUIRES_CONFIRMATION",
          "PENDING",
        ].includes(current.state)
      ) {
        continue;
      }
      const reflected = operationReflectedByReconciliation(current, previousSession, result);
      const state: Payments.PaymentOperationState = reflected
        ? "SUCCEEDED"
        : result.state === "EXPIRED"
          ? "EXPIRED"
          : "FAILED";
      const operation: Payments.PaymentOperationSnapshot = {
        ...current,
        state,
        providerReference: result.providerReference,
        networkTransactionId: reflected ? result.networkTransactionId : null,
        customerAction: null,
        pendingReason: null,
        pendingExpiresAt: null,
        nextReconcileAt: null,
        confirmationExpiresAt: null,
        failure:
          reflected || state === "EXPIRED"
            ? null
            : {
                category: "CONFLICT",
                code: "PAYMENT_OPERATION_NOT_REFLECTED_BY_RECONCILIATION",
                message: "The provider reconciliation did not confirm the pending operation.",
                retryable: false,
                providerCode: null,
              },
        revision: current.revision + 1,
        completedAt: result.observedAt,
      };
      await this.connection
        .update(paymentOperation)
        .set({
          state: operation.state,
          revision: operation.revision,
          payload: operation,
          updatedAt: result.observedAt,
        })
        .where(eq(paymentOperation.id, operation.operationId));
      if (operation.state === "FAILED") failures.push(operation);
    }
    return failures;
  }

  private async reschedulePendingOperations(
    session: Payments.PaymentSessionSnapshot,
    reconciliationOperationId: string,
    result: Extract<Payments.PaymentProviderReconcileResult, { state: "PENDING" }>,
  ): Promise<void> {
    const rows = await this.connection
      .select()
      .from(paymentOperation)
      .where(
        and(
          eq(paymentOperation.storeId, session.storeId),
          eq(paymentOperation.paymentSessionId, session.paymentSessionId),
        ),
      )
      .orderBy(asc(paymentOperation.createdAt))
      .for("update");
    for (const row of rows) {
      const current = operationSnapshot(row);
      if (
        current.operationId === reconciliationOperationId ||
        !["REQUIRES_ACTION", "REQUIRES_CONFIRMATION", "PENDING"].includes(current.state)
      ) {
        continue;
      }
      const deadline = earliestTimestamp(
        session.expiresAt,
        current.pendingExpiresAt ??
          current.customerAction?.expiresAt ??
          current.confirmationExpiresAt ??
          result.pendingExpiresAt,
      );
      const proposed = Date.parse(result.observedAt) + 60_000;
      const nextReconcileAt = new Date(Math.min(proposed, Date.parse(deadline))).toISOString();
      const operation: Payments.PaymentOperationSnapshot = {
        ...current,
        nextReconcileAt,
        revision: current.revision + 1,
      };
      await this.connection
        .update(paymentOperation)
        .set({
          revision: operation.revision,
          payload: operation,
          updatedAt: result.observedAt,
        })
        .where(eq(paymentOperation.id, operation.operationId));
    }
  }

  private async closeCancelledOperations(
    session: Payments.PaymentSessionSnapshot,
    cancellationOperationId: string,
    completedAt: string,
  ): Promise<void> {
    const rows = await this.connection
      .select()
      .from(paymentOperation)
      .where(
        and(
          eq(paymentOperation.storeId, session.storeId),
          eq(paymentOperation.paymentSessionId, session.paymentSessionId),
        ),
      )
      .orderBy(asc(paymentOperation.createdAt))
      .for("update");
    for (const row of rows) {
      const current = operationSnapshot(row);
      if (
        current.operationId === cancellationOperationId ||
        ["SUCCEEDED", "FAILED", "EXPIRED"].includes(current.state)
      ) {
        continue;
      }
      const operation: Payments.PaymentOperationSnapshot = {
        ...current,
        state: "FAILED",
        customerAction: null,
        pendingReason: null,
        pendingExpiresAt: null,
        nextReconcileAt: null,
        confirmationExpiresAt: null,
        failure: {
          category: "CONFLICT",
          code: "PAYMENT_OPERATION_CANCELLED",
          message: "The pending provider operation was cancelled.",
          retryable: false,
          providerCode: null,
        },
        revision: current.revision + 1,
        completedAt,
      };
      await this.connection
        .update(paymentOperation)
        .set({
          state: operation.state,
          revision: operation.revision,
          payload: operation,
          updatedAt: completedAt,
        })
        .where(eq(paymentOperation.id, operation.operationId));
    }
  }

  private async recordProviderEvent(
    event: Readonly<{
      providerAccountId: string;
      providerEventId: string;
      eventHash: string;
      occurredAt: string;
      payload: Record<string, unknown>;
    }>,
    storeId: string,
  ): Promise<"RECORDED" | "DUPLICATE" | "CONFLICT"> {
    const inserted = await this.connection
      .insert(paymentProviderEvent)
      .values({
        storeId,
        providerAccountId: event.providerAccountId,
        providerEventId: event.providerEventId,
        eventHash: event.eventHash,
        occurredAt: event.occurredAt,
        payload: event.payload,
      })
      .onConflictDoNothing()
      .returning({ id: paymentProviderEvent.id });
    if (inserted.length > 0) return "RECORDED";
    const existing = (
      await this.connection
        .select()
        .from(paymentProviderEvent)
        .where(
          and(
            eq(paymentProviderEvent.storeId, storeId),
            eq(paymentProviderEvent.providerAccountId, event.providerAccountId),
            eq(paymentProviderEvent.providerEventId, event.providerEventId),
          ),
        )
        .limit(1)
    )[0];
    if (!existing) throw new Error("PAYMENT_PROVIDER_EVENT_PERSISTENCE_CONFLICT");
    return existing.eventHash === event.eventHash ? "DUPLICATE" : "CONFLICT";
  }
}

function collectionSnapshot(
  row: typeof paymentCollection.$inferSelect,
): Payments.PaymentCollectionSnapshot {
  return row.payload as Payments.PaymentCollectionSnapshot;
}

function sessionSnapshot(row: typeof paymentSession.$inferSelect): Payments.PaymentSessionSnapshot {
  return row.payload as Payments.PaymentSessionSnapshot;
}

function operationSnapshot(
  row: typeof paymentOperation.$inferSelect,
): Payments.PaymentOperationSnapshot {
  return row.payload as Payments.PaymentOperationSnapshot;
}

function disputeSnapshot(row: typeof paymentDispute.$inferSelect): Payments.PaymentDisputeSnapshot {
  return row.payload as Payments.PaymentDisputeSnapshot;
}

function prepared(
  duplicate: boolean,
  collection: Payments.PaymentCollectionSnapshot,
  session: Payments.PaymentSessionSnapshot,
  operation: Payments.PaymentOperationSnapshot,
  params: Payments.CreatePaymentSessionParams,
  deadlineAt: string,
): PreparedPaymentSession {
  const request: Payments.PaymentProviderCreatePaymentRequest = {
    protocolVersion: 1,
    operation: "CREATE_PAYMENT",
    operationId: operation.operationId,
    paymentSessionId: session.paymentSessionId,
    paymentCollectionId: collection.paymentCollectionId,
    providerAccountId: session.method.providerAccountId,
    idempotencyKey: operation.idempotency.key,
    idempotencyRequestHash: operation.idempotency.requestHash,
    correlationId: params.correlationId,
    deadlineAt,
    amount: session.amount,
    kind: session.kind,
    providerMethodKey: session.method.providerMethodKey,
    orderReference: session.orderId,
    returnUrl: params.returnUrl,
    customer: params.customer,
    customerInput: params.customerInput,
  };
  return { duplicate, route: operation.route, collection, session, operation, request };
}

function preparedOperation(
  duplicate: boolean,
  collection: Payments.PaymentCollectionSnapshot,
  session: Payments.PaymentSessionSnapshot,
  operation: Payments.PaymentOperationSnapshot,
  params:
    | Payments.CancelPaymentParams
    | Payments.CapturePaymentParams
    | Payments.VoidPaymentParams
    | Payments.RefundPaymentParams
    | Payments.ReconcilePaymentParams,
  deadlineAt: string,
): PreparedPaymentOperation {
  const base = {
    protocolVersion: 1 as const,
    operationId: operation.operationId,
    paymentSessionId: session.paymentSessionId,
    paymentCollectionId: collection.paymentCollectionId,
    providerAccountId: session.method.providerAccountId,
    idempotencyKey: operation.idempotency.key,
    idempotencyRequestHash: operation.idempotency.requestHash,
    correlationId: params.correlationId,
    deadlineAt,
    providerReference: session.providerReference!,
  };
  let request: Payments.PaymentProviderOperationRequest;
  switch (operation.type) {
    case "CANCEL":
      request = { ...base, operation: "CANCEL", reason: "reason" in params ? params.reason : null };
      break;
    case "CAPTURE":
      request = { ...base, operation: "CAPTURE", amount: operation.amount };
      break;
    case "VOID":
      request = { ...base, operation: "VOID", reason: "reason" in params ? params.reason : null };
      break;
    case "REFUND":
      request = {
        ...base,
        operation: "REFUND",
        amount: operation.amount,
        reason: "reason" in params ? params.reason : null,
      };
      break;
    case "RECONCILE":
      request = { ...base, operation: "RECONCILE" };
      break;
    default:
      throw new Error("PAYMENT_OPERATION_REQUEST_UNSUPPORTED");
  }
  return { duplicate, route: operation.route, collection, session, operation, request };
}

function preparedConfirmation(
  duplicate: boolean,
  collection: Payments.PaymentCollectionSnapshot,
  session: Payments.PaymentSessionSnapshot,
  operation: Payments.PaymentOperationSnapshot,
  input: Readonly<{
    confirmation: Payments.PaymentSettlementConfirmation;
    route: Payments.PaymentProviderRouteSnapshot;
    deadlineAt: string;
    correlationId: string;
  }>,
): PreparedPaymentConfirmation {
  if (input.confirmation.decision === "REJECTED") {
    return { duplicate, route: operation.route, collection, session, operation, request: null };
  }
  return {
    duplicate,
    route: operation.route,
    collection,
    session,
    operation,
    request: {
      protocolVersion: 1,
      operation: "CONFIRM",
      operationId: operation.operationId,
      paymentSessionId: session.paymentSessionId,
      paymentCollectionId: collection.paymentCollectionId,
      providerAccountId: session.method.providerAccountId,
      idempotencyKey: operation.idempotency.key,
      idempotencyRequestHash: operation.idempotency.requestHash,
      correlationId: input.correlationId,
      deadlineAt: input.deadlineAt,
      amount: session.amount,
      providerReference: session.providerReference!,
      confirmation: input.confirmation,
    },
  };
}

function assertOperationAllowed(
  session: Payments.PaymentSessionSnapshot,
  type: "CANCEL" | "CAPTURE" | "VOID" | "REFUND" | "RECONCILE",
  amount: Payments.PaymentCollectionSnapshot["targetAmount"] | null,
): void {
  if (amount && amount.currencyCode !== session.amount.currencyCode) {
    throw new Error("PAYMENT_CURRENCY_MISMATCH");
  }
  const requested = amount ? BigInt(amount.amountMinor) : 0n;
  if (amount && requested <= 0n) throw new Error("PAYMENT_OPERATION_AMOUNT_INVALID");
  const authorized = BigInt(session.authorizedAmount.amountMinor);
  const captured = BigInt(session.capturedAmount.amountMinor);
  const refunded = BigInt(session.refundedAmount.amountMinor);
  const voided = BigInt(session.voidedAmount.amountMinor);
  switch (type) {
    case "CANCEL":
      if (
        !["CREATED", "PROCESSING", "REQUIRES_ACTION", "REQUIRES_CONFIRMATION", "PENDING"].includes(
          session.state,
        )
      ) {
        throw new Error("PAYMENT_NOT_CANCELLABLE");
      }
      break;
    case "CAPTURE":
      if (
        !["AUTHORIZED", "PARTIALLY_CAPTURED"].includes(session.state) ||
        requested > authorized - captured - voided
      ) {
        throw new Error("PAYMENT_NOT_CAPTURABLE");
      }
      break;
    case "VOID":
      if (
        !["AUTHORIZED", "PARTIALLY_CAPTURED"].includes(session.state) ||
        authorized - captured - voided <= 0n
      ) {
        throw new Error("PAYMENT_NOT_VOIDABLE");
      }
      break;
    case "REFUND":
      if (
        !["CAPTURED", "PARTIALLY_CAPTURED", "PARTIALLY_REFUNDED"].includes(session.state) ||
        requested > captured - refunded
      ) {
        throw new Error("PAYMENT_NOT_REFUNDABLE");
      }
      break;
    case "RECONCILE":
      if (!session.providerReference) throw new Error("PAYMENT_NOT_RECONCILABLE");
      break;
  }
}

function assertNoConflictingOperation(
  operations: readonly Payments.PaymentOperationSnapshot[],
  requestedType: "CANCEL" | "CAPTURE" | "VOID" | "REFUND" | "RECONCILE",
): void {
  const active = operations.filter((operation) =>
    ["REQUESTED", "PROCESSING", "REQUIRES_ACTION", "REQUIRES_CONFIRMATION", "PENDING"].includes(
      operation.state,
    ),
  );
  const conflict = active.some((operation) => {
    if (["REQUESTED", "PROCESSING"].includes(operation.state)) return true;
    if (requestedType === "RECONCILE") return operation.type === "RECONCILE";
    if (requestedType === "CANCEL") {
      return !["SALE", "AUTHORIZE", "CONFIRM"].includes(operation.type);
    }
    return true;
  });
  if (conflict) throw new Error("PAYMENT_OPERATION_IN_PROGRESS");
}

function assertSettlementConfirmation(
  confirmation: Payments.PaymentSettlementConfirmation,
  session: Payments.PaymentSessionSnapshot,
  effectiveAt: string,
): void {
  if (Date.parse(confirmation.confirmedAt) > Date.parse(effectiveAt)) {
    throw new Error("PAYMENT_CONFIRMATION_TIME_INVALID");
  }
  if (confirmation.decision === "REJECTED") return;
  if (
    confirmation.checkoutVersion !== session.basedOnCheckoutVersion ||
    confirmation.finalQuoteRevision !== session.basedOnFinalQuoteRevision ||
    Date.parse(confirmation.expiresAt) <= Date.parse(effectiveAt)
  ) {
    throw new Error("PAYMENT_CONFIRMATION_PROVENANCE_MISMATCH");
  }
}

function assertProviderResultReference(
  session: Payments.PaymentSessionSnapshot,
  result: Payments.PaymentProviderOperationResult | Payments.PaymentProviderReconcileResult,
): void {
  if (
    result.providerReference !== null &&
    session.providerReference !== null &&
    result.providerReference !== session.providerReference
  ) {
    throw new Error("PAYMENT_PROVIDER_REFERENCE_MISMATCH");
  }
}

function operationReflectedByReconciliation(
  operation: Payments.PaymentOperationSnapshot,
  previousSession: Payments.PaymentSessionSnapshot,
  result: Payments.PaymentProviderReconcileResult,
): boolean {
  const previousCaptured = BigInt(previousSession.capturedAmount.amountMinor);
  const previousRefunded = BigInt(previousSession.refundedAmount.amountMinor);
  const previousVoided = BigInt(previousSession.voidedAmount.amountMinor);
  switch (operation.type) {
    case "SALE":
    case "AUTHORIZE":
    case "CONFIRM":
      return [
        "AUTHORIZED",
        "PARTIALLY_CAPTURED",
        "CAPTURED",
        "VOIDED",
        "PARTIALLY_REFUNDED",
        "REFUNDED",
      ].includes(result.state);
    case "CANCEL":
      return result.state === "CANCELLED";
    case "CAPTURE":
      return (
        BigInt(result.capturedAmount.amountMinor) >=
        previousCaptured + BigInt(operation.amount.amountMinor)
      );
    case "VOID":
      return BigInt(result.voidedAmount.amountMinor) > previousVoided;
    case "REFUND":
      return (
        BigInt(result.refundedAmount.amountMinor) >=
        previousRefunded + BigInt(operation.amount.amountMinor)
      );
    case "RECONCILE":
      return true;
  }
}

function isReconcileResult(
  result: Payments.PaymentProviderOperationResult | Payments.PaymentProviderReconcileResult,
): result is Payments.PaymentProviderReconcileResult {
  return result.status === "RECONCILED";
}

function applyReconcileOperationResult(
  operation: Payments.PaymentOperationSnapshot,
  result: Payments.PaymentProviderReconcileResult,
): Payments.PaymentOperationSnapshot {
  return {
    ...operation,
    state: "SUCCEEDED",
    providerReference: result.providerReference,
    networkTransactionId: result.networkTransactionId,
    pendingReason: result.pendingReason,
    pendingExpiresAt: result.pendingExpiresAt,
    revision: operation.revision + 1,
    completedAt: result.observedAt,
  };
}

function assertCollectionMatches(
  collection: Payments.PaymentCollectionSnapshot,
  params: Payments.CreatePaymentSessionParams,
) {
  if (
    collection.organizationId !== params.organizationId ||
    collection.checkoutId !== params.checkoutId ||
    collection.orderId !== params.orderId ||
    collection.basedOnCheckoutVersion !== params.expectedCheckoutVersion ||
    collection.basedOnFinalQuoteRevision !== params.finalQuoteRevision
  ) {
    throw new Error("PAYMENT_COLLECTION_PROVENANCE_MISMATCH");
  }
}

function expirationDeadline(session: Payments.PaymentSessionSnapshot): string {
  if (session.state === "REQUIRES_ACTION") {
    return earliestTimestamp(session.expiresAt, session.customerAction?.expiresAt);
  }
  if (session.state === "REQUIRES_CONFIRMATION") {
    if (!session.confirmationExpiresAt) {
      throw new Error("PAYMENT_CONFIRMATION_EXPIRY_MISSING");
    }
    return earliestTimestamp(session.expiresAt, session.confirmationExpiresAt);
  }
  if (session.state === "PENDING") {
    if (!session.pendingExpiresAt) throw new Error("PAYMENT_PENDING_EXPIRY_MISSING");
    return earliestTimestamp(session.expiresAt, session.pendingExpiresAt);
  }
  if (session.state === "CREATED") return session.expiresAt;
  throw new Error("PAYMENT_SESSION_NOT_EXPIRABLE");
}

function earliestTimestamp(platformDeadline: string, providerDeadline?: string | null): string {
  if (!providerDeadline) return platformDeadline;
  return Date.parse(providerDeadline) < Date.parse(platformDeadline)
    ? providerDeadline
    : platformDeadline;
}

function applyOperationResult(
  operation: Payments.PaymentOperationSnapshot,
  result: Payments.PaymentProviderOperationResult,
  completedAt: string,
): Payments.PaymentOperationSnapshot {
  const next: Payments.PaymentOperationSnapshot = {
    ...operation,
    state: result.status === "SUCCEEDED" ? "SUCCEEDED" : result.status,
    providerReference: result.providerReference,
    networkTransactionId: result.status === "SUCCEEDED" ? result.networkTransactionId : null,
    customerAction: result.status === "REQUIRES_ACTION" ? result.customerAction : null,
    pendingReason: result.status === "PENDING" ? result.pendingReason : null,
    pendingExpiresAt: result.status === "PENDING" ? result.pendingExpiresAt : null,
    nextReconcileAt: result.status === "PENDING" ? result.nextReconcileAt : null,
    confirmationExpiresAt:
      result.status === "REQUIRES_CONFIRMATION" ? result.confirmationExpiresAt : null,
    failure: result.status === "FAILED" ? result.failure : null,
    revision: operation.revision + 1,
    completedAt: ["SUCCEEDED", "FAILED"].includes(result.status) ? completedAt : null,
  };
  if (
    operation.state !== next.state &&
    !(
      PaymentOperationTransitions[operation.state] as readonly Payments.PaymentOperationState[]
    ).includes(next.state)
  ) {
    throw new Error("PAYMENT_OPERATION_TRANSITION_INVALID");
  }
  return next;
}

function assertTerminalCompletionCompatible(
  operation: Payments.PaymentOperationSnapshot,
  result: Payments.PaymentProviderOperationResult | Payments.PaymentProviderReconcileResult,
): void {
  const expectedState: Payments.PaymentOperationState = isReconcileResult(result)
    ? "SUCCEEDED"
    : result.status === "SUCCEEDED"
      ? "SUCCEEDED"
      : result.status === "FAILED"
        ? "FAILED"
        : result.status;
  if (operation.state !== expectedState) {
    throw new Error("PAYMENT_OPERATION_COMPLETION_CONFLICT");
  }
  if (
    result.providerReference !== null &&
    operation.providerReference !== null &&
    result.providerReference !== operation.providerReference
  ) {
    throw new Error("PAYMENT_PROVIDER_REFERENCE_MISMATCH");
  }
}

function resultTimestamp(result: Payments.PaymentProviderOperationResult): string {
  if (result.status === "SUCCEEDED") return result.processedAt;
  if (result.status === "FAILED") return result.failedAt;
  return result.observedAt;
}

function zero(currencyCode: string) {
  return { amountMinor: "0", currencyCode };
}
