import { PaymentSessionTransitions, type Payments } from "@shopana/broker-types";
import type { PaymentDomainEvent } from "../contracts/ports.js";

export type Money = Payments.PaymentCollectionSnapshot["targetAmount"];

export function zeroMoney(currencyCode: string): Money {
  return { amountMinor: "0", currencyCode };
}

export function money(currencyCode: string, amount: bigint): Money {
  if (amount < 0n) throw new Error("PAYMENT_AMOUNT_NEGATIVE");
  return { amountMinor: amount.toString(), currencyCode };
}

export function assertSameCurrency(...values: readonly Money[]): string {
  const currencyCode = values[0]?.currencyCode;
  if (!currencyCode || values.some((value) => value.currencyCode !== currencyCode)) {
    throw new Error("PAYMENT_CURRENCY_MISMATCH");
  }
  return currencyCode;
}

export function assertSessionAmounts(session: Payments.PaymentSessionSnapshot): void {
  assertSameCurrency(
    session.amount,
    session.authorizedAmount,
    session.capturedAmount,
    session.refundedAmount,
    session.voidedAmount,
  );
  const requested = BigInt(session.amount.amountMinor);
  const authorized = BigInt(session.authorizedAmount.amountMinor);
  const captured = BigInt(session.capturedAmount.amountMinor);
  const refunded = BigInt(session.refundedAmount.amountMinor);
  const voided = BigInt(session.voidedAmount.amountMinor);
  if (
    authorized > requested ||
    captured > authorized ||
    refunded > captured ||
    captured + voided > authorized
  ) {
    throw new Error("PAYMENT_AMOUNTS_INCONSISTENT");
  }
}

export function deriveCollection(
  current: Payments.PaymentCollectionSnapshot,
  sessions: readonly Payments.PaymentSessionSnapshot[],
  updatedAt: string,
): Payments.PaymentCollectionSnapshot {
  const currencyCode = current.targetAmount.currencyCode;
  let authorized = 0n;
  let captured = 0n;
  let refunded = 0n;
  for (const session of sessions) {
    assertSessionAmounts(session);
    assertSameCurrency(current.targetAmount, session.amount);
    authorized += BigInt(session.authorizedAmount.amountMinor)
      - BigInt(session.voidedAmount.amountMinor);
    captured += BigInt(session.capturedAmount.amountMinor);
    refunded += BigInt(session.refundedAmount.amountMinor);
  }
  const target = BigInt(current.targetAmount.amountMinor);
  if (authorized > target || captured > target || refunded > captured) {
    throw new Error("PAYMENT_COLLECTION_AMOUNT_EXCEEDED");
  }
  const netPaid = captured - refunded;
  const outstanding = target > netPaid ? target - netPaid : 0n;
  const active = sessions.some((session) =>
    ["CREATED", "PROCESSING", "REQUIRES_ACTION", "REQUIRES_CONFIRMATION", "PENDING"].includes(session.state),
  );
  let state: Payments.PaymentCollectionState;
  if (captured > 0n && refunded === captured) state = "REFUNDED";
  else if (refunded > 0n) state = "PARTIALLY_REFUNDED";
  else if (captured === target && target > 0n) state = "PAID";
  else if (captured > 0n) state = "PARTIALLY_PAID";
  else if (authorized === target && target > 0n) state = "AUTHORIZED";
  else if (authorized > 0n) state = "PARTIALLY_AUTHORIZED";
  else if (active) state = "PENDING";
  else if (sessions.length > 0 && sessions.every((session) =>
    ["FAILED", "EXPIRED", "CANCELLED", "VOIDED"].includes(session.state),
  )) state = "OPEN";
  else state = "OPEN";
  return {
    ...current,
    state,
    authorizedAmount: money(currencyCode, authorized),
    capturedAmount: money(currencyCode, captured),
    refundedAmount: money(currencyCode, refunded),
    outstandingAmount: money(currencyCode, outstanding),
    revision: current.revision + 1,
    updatedAt,
  };
}

export function applyProviderResult(
  current: Payments.PaymentSessionSnapshot,
  operation: Payments.PaymentOperationSnapshot,
  result: Payments.PaymentProviderOperationResult,
  updatedAt: string,
): Payments.PaymentSessionSnapshot {
  assertSameCurrency(current.amount, operation.amount);
  const transientInitial = operation.type === "SALE" || operation.type === "AUTHORIZE" || operation.type === "CONFIRM";
  const next: Payments.PaymentSessionSnapshot = {
    ...current,
    confirmation: operation.type === "CONFIRM" ? operation.confirmation : current.confirmation,
    providerReference: result.providerReference ?? current.providerReference,
    customerAction: transientInitial
      ? (result.status === "REQUIRES_ACTION" ? result.customerAction : null)
      : current.customerAction,
    pendingReason: transientInitial
      ? (result.status === "PENDING" ? result.pendingReason : null)
      : current.pendingReason,
    pendingExpiresAt: transientInitial
      ? (result.status === "PENDING" ? result.pendingExpiresAt : null)
      : current.pendingExpiresAt,
    nextReconcileAt: transientInitial
      ? (result.status === "PENDING" ? result.nextReconcileAt : null)
      : current.nextReconcileAt,
    confirmationExpiresAt: transientInitial
      ? (result.status === "REQUIRES_CONFIRMATION" ? result.confirmationExpiresAt : null)
      : current.confirmationExpiresAt,
    lastFailure: result.status === "FAILED" ? result.failure : current.lastFailure,
    revision: current.revision + 1,
    updatedAt,
  };

  if (result.status === "REQUIRES_ACTION" || result.status === "REQUIRES_CONFIRMATION" || result.status === "PENDING") {
    next.state = transientInitial ? result.status : current.state;
    assertSessionTransition(current.state, next.state);
    return next;
  }
  if (result.status === "FAILED") {
    next.state = transientInitial ? "FAILED" : current.state;
    assertSessionTransition(current.state, next.state);
    return next;
  }

  next.authorizationExpiresAt = result.authorizationExpiresAt ?? current.authorizationExpiresAt;
  next.instrument = result.instrument ?? current.instrument;
  next.lastFailure = null;
  const amount = BigInt(operation.amount.amountMinor);
  const currency = current.amount.currencyCode;
  switch (operation.type) {
    case "SALE":
    case "AUTHORIZE":
    case "CONFIRM": {
      const isSale = current.kind === "SALE";
      next.authorizedAmount = current.amount;
      next.capturedAmount = isSale ? current.amount : current.capturedAmount;
      next.state = isSale ? "CAPTURED" : "AUTHORIZED";
      break;
    }
    case "CANCEL":
      if (BigInt(current.authorizedAmount.amountMinor) !== 0n) throw new Error("PAYMENT_CANCEL_AFTER_AUTHORIZATION");
      next.state = "CANCELLED";
      break;
    case "CAPTURE": {
      const authorized = BigInt(current.authorizedAmount.amountMinor);
      const captured = BigInt(current.capturedAmount.amountMinor) + amount;
      const voided = BigInt(current.voidedAmount.amountMinor);
      if (captured + voided > authorized) throw new Error("PAYMENT_CAPTURE_AMOUNT_EXCEEDED");
      next.capturedAmount = money(currency, captured);
      next.state = captured === authorized ? "CAPTURED" : "PARTIALLY_CAPTURED";
      break;
    }
    case "VOID": {
      const authorized = BigInt(current.authorizedAmount.amountMinor);
      const captured = BigInt(current.capturedAmount.amountMinor);
      const alreadyVoided = BigInt(current.voidedAmount.amountMinor);
      const voidable = authorized - captured - alreadyVoided;
      if (voidable <= 0n) throw new Error("PAYMENT_NOT_VOIDABLE");
      next.voidedAmount = money(currency, alreadyVoided + voidable);
      next.state = captured === 0n ? "VOIDED" : "PARTIALLY_CAPTURED";
      break;
    }
    case "REFUND": {
      const captured = BigInt(current.capturedAmount.amountMinor);
      const refunded = BigInt(current.refundedAmount.amountMinor) + amount;
      if (refunded > captured) throw new Error("PAYMENT_REFUND_AMOUNT_EXCEEDED");
      next.refundedAmount = money(currency, refunded);
      next.state = refunded === captured ? "REFUNDED" : "PARTIALLY_REFUNDED";
      break;
    }
    case "RECONCILE":
      throw new Error("PAYMENT_RECONCILE_RESULT_REQUIRED");
  }
  assertSessionTransition(current.state, next.state);
  assertSessionAmounts(next);
  return next;
}

export function applyReconcileResult(
  current: Payments.PaymentSessionSnapshot,
  result: Payments.PaymentProviderReconcileResult,
): Payments.PaymentSessionSnapshot {
  assertSameCurrency(
    current.amount,
    result.authorizedAmount,
    result.capturedAmount,
    result.refundedAmount,
    result.voidedAmount,
  );
  const nextReconcileAt = result.state === "PENDING"
    ? nextPlatformReconcileAt(result.observedAt, result.pendingExpiresAt)
    : null;
  const pendingSettledOperation = result.state === "PENDING" && [
    "AUTHORIZED",
    "PARTIALLY_CAPTURED",
    "CAPTURED",
    "PARTIALLY_REFUNDED",
    "REFUNDED",
    "VOIDED",
  ].includes(current.state);
  if (
    pendingSettledOperation &&
    (
      result.authorizedAmount.amountMinor !== current.authorizedAmount.amountMinor ||
      result.capturedAmount.amountMinor !== current.capturedAmount.amountMinor ||
      result.refundedAmount.amountMinor !== current.refundedAmount.amountMinor ||
      result.voidedAmount.amountMinor !== current.voidedAmount.amountMinor
    )
  ) {
    throw new Error("PAYMENT_RECONCILE_PENDING_TOTALS_CHANGED");
  }
  const next: Payments.PaymentSessionSnapshot = {
    ...current,
    state: pendingSettledOperation ? current.state : result.state,
    authorizedAmount: pendingSettledOperation ? current.authorizedAmount : result.authorizedAmount,
    capturedAmount: pendingSettledOperation ? current.capturedAmount : result.capturedAmount,
    refundedAmount: pendingSettledOperation ? current.refundedAmount : result.refundedAmount,
    voidedAmount: pendingSettledOperation ? current.voidedAmount : result.voidedAmount,
    providerReference: result.providerReference,
    customerAction: null,
    pendingReason: pendingSettledOperation ? current.pendingReason : result.pendingReason,
    pendingExpiresAt: pendingSettledOperation ? current.pendingExpiresAt : result.pendingExpiresAt,
    nextReconcileAt: pendingSettledOperation ? current.nextReconcileAt : nextReconcileAt,
    confirmationExpiresAt: null,
    lastFailure: result.state === "FAILED"
      ? {
          category: "UNKNOWN",
          code: "PAYMENT_RECONCILED_FAILED",
          message: "The payment provider reports that the payment failed.",
          retryable: false,
          providerCode: null,
        }
      : current.lastFailure,
    revision: current.revision + 1,
    updatedAt: result.observedAt,
  };
  assertSessionAmounts(next);
  return next;
}

export function buildTransitionEvents(input: Readonly<{
  previousCollection: Payments.PaymentCollectionSnapshot;
  collection: Payments.PaymentCollectionSnapshot;
  previousSession: Payments.PaymentSessionSnapshot | null;
  session: Payments.PaymentSessionSnapshot;
  operation: Payments.PaymentOperationSnapshot;
  occurredAt: string;
  reason?: string | null;
}>): readonly PaymentDomainEvent[] {
  const { previousCollection, collection, previousSession, session, operation, occurredAt } = input;
  const base = {
    schemaVersion: 1 as const,
    paymentCollectionId: collection.paymentCollectionId,
    paymentSessionId: session.paymentSessionId,
    operationId: operation.operationId,
    organizationId: session.organizationId,
    storeId: session.storeId,
    checkoutId: session.checkoutId,
    orderId: session.orderId,
    operationType: operation.type,
    providerCode: session.method.providerCode,
    route: operation.route,
    occurredAt,
    sessionRevision: session.revision,
    sessionState: session.state,
    sessionAmount: session.amount,
  };
  const events: PaymentDomainEvent[] = [];
  if (previousSession === null) {
    events.push({ type: "payment.session.created", payload: {
      ...base,
      kind: session.kind,
      amount: session.amount,
      attemptSequence: session.attemptSequence,
    } });
  }
  if (
    operation.confirmation &&
    previousSession?.confirmation?.confirmationId !== operation.confirmation.confirmationId
  ) {
    events.push({ type: "payment.confirmation.completed", payload: {
      ...base,
      providerReference: session.providerReference!,
      confirmation: operation.confirmation,
    } });
  }
  if (
    session.state !== previousSession?.state ||
    ["REQUIRES_ACTION", "REQUIRES_CONFIRMATION", "PENDING", "SUCCEEDED", "FAILED"].includes(operation.state)
  ) {
    if (operation.state === "REQUIRES_ACTION" && operation.customerAction && operation.providerReference) {
      events.push({ type: "payment.requires_action", payload: { ...base, customerAction: operation.customerAction, providerReference: operation.providerReference } });
    } else if (operation.state === "REQUIRES_CONFIRMATION" && operation.providerReference && operation.confirmationExpiresAt) {
      events.push({ type: "payment.requires_confirmation", payload: { ...base, providerReference: operation.providerReference, confirmationExpiresAt: operation.confirmationExpiresAt } });
    } else if (
      operation.state === "PENDING" &&
      operation.providerReference &&
      operation.pendingReason &&
      operation.pendingExpiresAt
    ) {
      events.push({ type: "payment.pending", payload: { ...base, providerReference: operation.providerReference, reason: operation.pendingReason, expiresAt: operation.pendingExpiresAt, nextReconcileAt: operation.nextReconcileAt } });
    } else if (
      session.state === "PENDING" &&
      session.providerReference &&
      session.pendingReason &&
      session.pendingExpiresAt &&
      operation.type === "RECONCILE"
    ) {
      events.push({ type: "payment.pending", payload: { ...base, providerReference: session.providerReference, reason: session.pendingReason, expiresAt: session.pendingExpiresAt, nextReconcileAt: session.nextReconcileAt } });
    } else if (
      session.state === "AUTHORIZED" &&
      session.providerReference &&
      operation.state === "SUCCEEDED" &&
      (["AUTHORIZE", "CONFIRM"].includes(operation.type) ||
        (operation.type === "RECONCILE" && increased(previousSession?.authorizedAmount, session.authorizedAmount)))
    ) {
      events.push({ type: "payment.authorized", payload: { ...base, amount: transitionAmount(operation, previousSession?.authorizedAmount, session.authorizedAmount), providerReference: session.providerReference, networkTransactionId: operation.networkTransactionId } });
    } else if ((session.state === "CAPTURED" || session.state === "PARTIALLY_CAPTURED") && session.providerReference && operation.state === "SUCCEEDED" && (["SALE", "CONFIRM", "CAPTURE"].includes(operation.type) || (operation.type === "RECONCILE" && increased(previousSession?.capturedAmount, session.capturedAmount)))) {
      const authorized = BigInt(session.authorizedAmount.amountMinor);
      const captured = BigInt(session.capturedAmount.amountMinor);
      events.push({ type: "payment.captured", payload: { ...base, amount: transitionAmount(operation, previousSession?.capturedAmount, session.capturedAmount), capturedTotal: session.capturedAmount, providerReference: session.providerReference, networkTransactionId: operation.networkTransactionId, resultingState: session.state, remainingCapturableAmount: money(session.amount.currencyCode, authorized - captured - BigInt(session.voidedAmount.amountMinor)) } });
    } else if ((session.state === "VOIDED" || session.state === "PARTIALLY_CAPTURED") && session.providerReference && (operation.type === "VOID" || (operation.type === "RECONCILE" && increased(previousSession?.voidedAmount, session.voidedAmount))) && operation.state === "SUCCEEDED") {
      events.push({ type: "payment.voided", payload: { ...base, voidedTotal: session.voidedAmount, capturedTotal: session.capturedAmount, providerReference: session.providerReference, resultingState: session.state } });
    } else if ((session.state === "PARTIALLY_REFUNDED" || session.state === "REFUNDED") && session.providerReference && operation.state === "SUCCEEDED" && (operation.type === "REFUND" || (operation.type === "RECONCILE" && increased(previousSession?.refundedAmount, session.refundedAmount)))) {
      events.push({ type: "payment.refunded", payload: { ...base, amount: transitionAmount(operation, previousSession?.refundedAmount, session.refundedAmount), refundedTotal: session.refundedAmount, providerReference: session.providerReference, resultingState: session.state, remainingRefundableAmount: money(session.amount.currencyCode, BigInt(session.capturedAmount.amountMinor) - BigInt(session.refundedAmount.amountMinor)) } });
    } else if (session.state === "CANCELLED") {
      events.push({ type: "payment.cancelled", payload: { ...base, providerReference: session.providerReference, reason: input.reason ?? null } });
    } else if (
      (operation.state === "FAILED" && operation.failure) ||
      (session.state === "FAILED" && previousSession?.state !== "FAILED" && session.lastFailure)
    ) {
      events.push({ type: "payment.failed", payload: { ...base, failure: operation.failure ?? session.lastFailure! } });
    } else if (session.state === "EXPIRED" && previousSession && ["PENDING", "REQUIRES_ACTION", "REQUIRES_CONFIRMATION"].includes(previousSession.state)) {
      events.push({ type: "payment.expired", payload: { ...base, previousState: previousSession.state as "PENDING" | "REQUIRES_ACTION" | "REQUIRES_CONFIRMATION", reason: input.reason ?? "Payment session expired." } });
    }
  }
  if (collection.state !== previousCollection.state) {
    events.push({ type: "payment.collection.state_changed", payload: {
      schemaVersion: 1,
      paymentCollectionId: collection.paymentCollectionId,
      organizationId: collection.organizationId,
      storeId: collection.storeId,
      checkoutId: collection.checkoutId,
      orderId: collection.orderId,
      previousState: previousCollection.state,
      state: collection.state,
      targetAmount: collection.targetAmount,
      authorizedAmount: collection.authorizedAmount,
      capturedAmount: collection.capturedAmount,
      refundedAmount: collection.refundedAmount,
      outstandingAmount: collection.outstandingAmount,
      collectionRevision: collection.revision,
      occurredAt,
    } });
  }
  return events;
}

function transitionAmount(
  operation: Payments.PaymentOperationSnapshot,
  previous: Money | undefined,
  current: Money,
): Money {
  if (operation.type !== "RECONCILE") return operation.amount;
  const delta = BigInt(current.amountMinor) - BigInt(previous?.amountMinor ?? "0");
  return money(current.currencyCode, delta > 0n ? delta : 0n);
}

function increased(previous: Money | undefined, current: Money): boolean {
  return BigInt(current.amountMinor) > BigInt(previous?.amountMinor ?? "0");
}

function nextPlatformReconcileAt(observedAt: string, pendingExpiresAt: string): string | null {
  const candidate = Date.parse(observedAt) + 60_000;
  return candidate < Date.parse(pendingExpiresAt)
    ? new Date(candidate).toISOString()
    : null;
}

function assertSessionTransition(
  previous: Payments.PaymentSessionState,
  next: Payments.PaymentSessionState,
): void {
  if (
    previous !== next &&
    !canReachSessionState(previous, next)
  ) {
    throw new Error("PAYMENT_SESSION_TRANSITION_INVALID");
  }
}

function canReachSessionState(
  previous: Payments.PaymentSessionState,
  next: Payments.PaymentSessionState,
): boolean {
  const direct = PaymentSessionTransitions[previous] as readonly Payments.PaymentSessionState[];
  if (direct.includes(next)) return true;
  const processing = PaymentSessionTransitions.PROCESSING as readonly Payments.PaymentSessionState[];
  return direct.includes("PROCESSING") && processing.includes(next);
}
