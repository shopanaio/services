import { and, asc, eq, sql } from "drizzle-orm";
import type { Payments } from "@shopana/broker-types";
import { TransactionManager } from "@shopana/shared-kernel";
import { contentRevision } from "../../checkout-pipeline/canonicalJson.js";
import type { PaymentsDatabase } from "./database.js";
import { paymentCollection, paymentOperation, paymentSession } from "./schema.js";

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
        expectedCheckoutVersion: params.expectedCheckoutVersion,
        finalQuoteRevision: params.finalQuoteRevision,
        targetAmount: params.targetAmount,
      });
      const existingRow = (await this.connection
        .select()
        .from(paymentCollection)
        .where(and(
          eq(paymentCollection.storeId, params.storeId),
          eq(paymentCollection.idempotencyKey, params.idempotencyKey),
        ))
        .limit(1)
        .for("update"))[0];
      if (existingRow) {
        if (existingRow.requestHash !== requestHash) {
          throw new Error("PAYMENT_IDEMPOTENCY_KEY_REUSED");
        }
        return { collection: collectionSnapshot(existingRow), duplicate: true };
      }

      const now = new Date().toISOString();
      const [idRow] = await this.connection.execute<{ id: string }>(
        sql`SELECT uuidv7() AS id`,
      );
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
        basedOnCheckoutVersion: params.expectedCheckoutVersion,
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
      const collectionRow = (await this.connection
        .select()
        .from(paymentCollection)
        .where(and(
          eq(paymentCollection.storeId, params.storeId),
          eq(paymentCollection.id, params.paymentCollectionId),
        ))
        .limit(1)
        .for("update"))[0];
      if (!collectionRow) throw new Error("PAYMENT_COLLECTION_NOT_FOUND");
      const collection = collectionSnapshot(collectionRow);
      assertCollectionMatches(collection, params);

      const requestHash = paymentLifecycleRequestHash("session", {
        organizationId: params.organizationId,
        storeId: params.storeId,
        checkoutId: params.checkoutId,
        orderId: params.orderId,
        paymentCollectionId: params.paymentCollectionId,
        expectedCheckoutVersion: params.expectedCheckoutVersion,
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
      const existingRow = (await this.connection
        .select()
        .from(paymentSession)
        .where(and(
          eq(paymentSession.paymentCollectionId, params.paymentCollectionId),
          eq(paymentSession.idempotencyKey, params.idempotencyKey),
        ))
        .limit(1))[0];
      if (existingRow) {
        if (existingRow.requestHash !== requestHash) {
          throw new Error("PAYMENT_IDEMPOTENCY_KEY_REUSED");
        }
        const operationRow = (await this.connection
          .select()
          .from(paymentOperation)
          .where(eq(paymentOperation.paymentSessionId, existingRow.id))
          .orderBy(asc(paymentOperation.createdAt))
          .limit(1))[0];
        if (!operationRow) throw new Error("PAYMENT_OPERATION_NOT_FOUND");
        const session = sessionSnapshot(existingRow);
        const operation = operationSnapshot(operationRow);
        return prepared(true, collection, session, operation, params, input.deadlineAt);
      }

      if (collection.state !== "OPEN") throw new Error("PAYMENT_COLLECTION_NOT_OPEN");
      if (!sameMoney(collection.targetAmount, params.amount)) {
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
      const operationType: Payments.PaymentOperationType = params.kind === "SALE" ? "SALE" : "AUTHORIZE";
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
        basedOnCheckoutVersion: params.expectedCheckoutVersion,
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
      return prepared(false, collection, session, operation, params, input.deadlineAt);
    });
  }

  async completeInitialOperation(
    preparedValue: PreparedPaymentSession,
    result: Payments.PaymentProviderOperationResult,
  ): Promise<Payments.GetPaymentSessionResult> {
    return this.tx.run(async () => {
      const currentSessionRow = (await this.connection
        .select()
        .from(paymentSession)
        .where(and(
          eq(paymentSession.storeId, preparedValue.session.storeId),
          eq(paymentSession.id, preparedValue.session.paymentSessionId),
        ))
        .limit(1)
        .for("update"))[0];
      const currentOperationRow = (await this.connection
        .select()
        .from(paymentOperation)
        .where(and(
          eq(paymentOperation.storeId, preparedValue.session.storeId),
          eq(paymentOperation.id, preparedValue.operation.operationId),
        ))
        .limit(1)
        .for("update"))[0];
      const currentCollectionRow = (await this.connection
        .select()
        .from(paymentCollection)
        .where(and(
          eq(paymentCollection.storeId, preparedValue.collection.storeId),
          eq(paymentCollection.id, preparedValue.collection.paymentCollectionId),
        ))
        .limit(1)
        .for("update"))[0];
      if (!currentSessionRow || !currentOperationRow || !currentCollectionRow) {
        throw new Error("PAYMENT_OPERATION_NOT_FOUND");
      }
      const currentOperation = operationSnapshot(currentOperationRow);
      if (currentOperation.state !== "PROCESSING") {
        const operationRows = await this.connection
          .select()
          .from(paymentOperation)
          .where(and(
            eq(paymentOperation.storeId, preparedValue.session.storeId),
            eq(
              paymentOperation.paymentSessionId,
              preparedValue.session.paymentSessionId,
            ),
          ))
          .orderBy(asc(paymentOperation.createdAt));
        return {
          session: sessionSnapshot(currentSessionRow),
          operations: operationRows.map(operationSnapshot),
        };
      }

      const completedAt = resultTimestamp(result);
      const operation = applyOperationResult(currentOperation, result, completedAt);
      const session = applySessionResult(sessionSnapshot(currentSessionRow), result, completedAt);
      const collection = applyCollectionResult(
        collectionSnapshot(currentCollectionRow),
        session,
        completedAt,
      );
      await this.connection.update(paymentOperation).set({
        state: operation.state,
        revision: operation.revision,
        payload: operation,
        updatedAt: completedAt,
      }).where(eq(paymentOperation.id, operation.operationId));
      await this.connection.update(paymentSession).set({
        state: session.state,
        providerReference: session.providerReference,
        revision: session.revision,
        payload: session,
        updatedAt: completedAt,
      }).where(eq(paymentSession.id, session.paymentSessionId));
      await this.connection.update(paymentCollection).set({
        state: collection.state,
        revision: collection.revision,
        payload: collection,
        updatedAt: completedAt,
      }).where(eq(paymentCollection.id, collection.paymentCollectionId));
      return { session, operations: [operation] };
    });
  }

  async expireSession(
    params: Payments.ExpirePaymentParams,
    effectiveAt: string,
  ): Promise<Readonly<{
    duplicate: boolean;
    collection: Payments.PaymentCollectionSnapshot;
    session: Payments.PaymentSessionSnapshot;
    operation: Payments.PaymentOperationSnapshot;
  }>> {
    return this.tx.run(async () => {
      const currentSessionRow = (await this.connection
        .select()
        .from(paymentSession)
        .where(and(
          eq(paymentSession.storeId, params.storeId),
          eq(paymentSession.id, params.paymentSessionId),
        ))
        .limit(1)
        .for("update"))[0];
      if (!currentSessionRow) throw new Error("PAYMENT_SESSION_NOT_FOUND");

      const currentCollectionRow = (await this.connection
        .select()
        .from(paymentCollection)
        .where(and(
          eq(paymentCollection.storeId, params.storeId),
          eq(paymentCollection.id, currentSessionRow.paymentCollectionId),
        ))
        .limit(1)
        .for("update"))[0];
      const operationRows = await this.connection
        .select()
        .from(paymentOperation)
        .where(and(
          eq(paymentOperation.storeId, params.storeId),
          eq(paymentOperation.paymentSessionId, params.paymentSessionId),
        ))
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
      if (currentSession.revision !== params.expectedSessionRevision) {
        throw new Error("PAYMENT_SESSION_REVISION_CONFLICT");
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
      const operation: Payments.PaymentOperationSnapshot = {
        ...currentOperation,
        state: "EXPIRED",
        failure,
        revision: currentOperation.revision + 1,
        completedAt: effectiveAt,
      };
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
      const collection: Payments.PaymentCollectionSnapshot = {
        ...currentCollection,
        state: "CANCELLED",
        revision: currentCollection.revision + 1,
        updatedAt: effectiveAt,
      };
      await this.connection.update(paymentOperation).set({
        state: operation.state,
        revision: operation.revision,
        payload: operation,
        updatedAt: effectiveAt,
      }).where(eq(paymentOperation.id, operation.operationId));
      await this.connection.update(paymentSession).set({
        state: session.state,
        revision: session.revision,
        payload: session,
        updatedAt: effectiveAt,
      }).where(eq(paymentSession.id, session.paymentSessionId));
      await this.connection.update(paymentCollection).set({
        state: collection.state,
        revision: collection.revision,
        payload: collection,
        updatedAt: effectiveAt,
      }).where(eq(paymentCollection.id, collection.paymentCollectionId));
      return { duplicate: false, collection, session, operation };
    });
  }

  async getCollection(
    params: Payments.GetPaymentCollectionParams,
  ): Promise<Payments.GetPaymentCollectionResult> {
    const row = (await this.db.select().from(paymentCollection).where(and(
      eq(paymentCollection.storeId, params.storeId),
      eq(paymentCollection.id, params.paymentCollectionId),
    )).limit(1))[0];
    if (!row) throw new Error("PAYMENT_COLLECTION_NOT_FOUND");
    const sessionRows = await this.db.select().from(paymentSession).where(and(
      eq(paymentSession.storeId, params.storeId),
      eq(paymentSession.paymentCollectionId, params.paymentCollectionId),
    )).orderBy(asc(paymentSession.attemptSequence));
    return { collection: collectionSnapshot(row), sessions: sessionRows.map(sessionSnapshot) };
  }

  async getSession(
    params: Payments.GetPaymentSessionParams,
  ): Promise<Payments.GetPaymentSessionResult> {
    const row = (await this.db.select().from(paymentSession).where(and(
      eq(paymentSession.storeId, params.storeId),
      eq(paymentSession.id, params.paymentSessionId),
    )).limit(1))[0];
    if (!row) throw new Error("PAYMENT_SESSION_NOT_FOUND");
    const operationRows = await this.db.select().from(paymentOperation).where(and(
      eq(paymentOperation.storeId, params.storeId),
      eq(paymentOperation.paymentSessionId, params.paymentSessionId),
    )).orderBy(asc(paymentOperation.createdAt));
    return { session: sessionSnapshot(row), operations: operationRows.map(operationSnapshot) };
  }
}

function collectionSnapshot(row: typeof paymentCollection.$inferSelect): Payments.PaymentCollectionSnapshot {
  return row.payload as Payments.PaymentCollectionSnapshot;
}

function sessionSnapshot(row: typeof paymentSession.$inferSelect): Payments.PaymentSessionSnapshot {
  return row.payload as Payments.PaymentSessionSnapshot;
}

function operationSnapshot(row: typeof paymentOperation.$inferSelect): Payments.PaymentOperationSnapshot {
  return row.payload as Payments.PaymentOperationSnapshot;
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
  return {
    ...operation,
    state: result.status === "SUCCEEDED" ? "SUCCEEDED" : result.status,
    providerReference: result.providerReference,
    networkTransactionId: result.status === "SUCCEEDED" ? result.networkTransactionId : null,
    customerAction: result.status === "REQUIRES_ACTION" ? result.customerAction : null,
    pendingReason: result.status === "PENDING" ? result.pendingReason : null,
    pendingExpiresAt: result.status === "PENDING" ? result.pendingExpiresAt : null,
    nextReconcileAt: result.status === "PENDING" ? result.nextReconcileAt : null,
    confirmationExpiresAt: result.status === "REQUIRES_CONFIRMATION"
      ? result.confirmationExpiresAt
      : null,
    failure: result.status === "FAILED" ? result.failure : null,
    revision: operation.revision + 1,
    completedAt: ["SUCCEEDED", "FAILED"].includes(result.status) ? completedAt : null,
  };
}

function applySessionResult(
  session: Payments.PaymentSessionSnapshot,
  result: Payments.PaymentProviderOperationResult,
  updatedAt: string,
): Payments.PaymentSessionSnapshot {
  const succeededState: Payments.PaymentSessionState = session.kind === "SALE" ? "CAPTURED" : "AUTHORIZED";
  return {
    ...session,
    state: result.status === "SUCCEEDED" ? succeededState : result.status,
    authorizedAmount: result.status === "SUCCEEDED" ? session.amount : session.authorizedAmount,
    capturedAmount: result.status === "SUCCEEDED" && session.kind === "SALE" ? session.amount : session.capturedAmount,
    providerReference: result.providerReference,
    authorizationExpiresAt: result.status === "SUCCEEDED" ? result.authorizationExpiresAt : null,
    instrument: result.status === "SUCCEEDED" ? result.instrument : null,
    customerAction: result.status === "REQUIRES_ACTION" ? result.customerAction : null,
    pendingReason: result.status === "PENDING" ? result.pendingReason : null,
    pendingExpiresAt: result.status === "PENDING" ? result.pendingExpiresAt : null,
    nextReconcileAt: result.status === "PENDING" ? result.nextReconcileAt : null,
    confirmationExpiresAt: result.status === "REQUIRES_CONFIRMATION"
      ? result.confirmationExpiresAt
      : null,
    lastFailure: result.status === "FAILED" ? result.failure : null,
    revision: session.revision + 1,
    updatedAt,
  };
}

function applyCollectionResult(
  collection: Payments.PaymentCollectionSnapshot,
  session: Payments.PaymentSessionSnapshot,
  updatedAt: string,
): Payments.PaymentCollectionSnapshot {
  const authorized = session.authorizedAmount;
  const captured = session.capturedAmount;
  return {
    ...collection,
    state: session.state === "CAPTURED" ? "PAID" : session.state === "AUTHORIZED" ? "AUTHORIZED" : session.state === "FAILED" ? "OPEN" : "PENDING",
    authorizedAmount: authorized,
    capturedAmount: captured,
    outstandingAmount: session.state === "CAPTURED" ? zero(collection.targetAmount.currencyCode) : collection.targetAmount,
    revision: collection.revision + 1,
    updatedAt,
  };
}

function resultTimestamp(result: Payments.PaymentProviderOperationResult): string {
  if (result.status === "SUCCEEDED") return result.processedAt;
  if (result.status === "FAILED") return result.failedAt;
  return result.observedAt;
}

function zero(currencyCode: string) {
  return { amountMinor: "0", currencyCode };
}

function sameMoney(left: { amountMinor: string; currencyCode: string }, right: { amountMinor: string; currencyCode: string }) {
  return left.currencyCode === right.currencyCode && BigInt(left.amountMinor) === BigInt(right.amountMinor);
}
