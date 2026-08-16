import type { Payments } from "@shopana/broker-types";
import type {
  PaymentLifecycleMethodBindingsPort,
  PaymentProviderAccountsPort,
  PaymentSettlementConfirmationPort,
  PaymentsProviderAppsPort,
} from "../contracts/ports.js";
import {
  PaymentLifecycleActionSchemas,
  parseProviderCompletion,
  parseProviderEvent,
  parseProviderOperationResult,
  parseProviderReconcileResult,
} from "../contracts/schemas.js";
import type { PaymentProviderCompletionContext } from "../contracts/actions.js";
import { contentRevision } from "../checkout-pipeline/canonicalJson.js";
import type {
  PaymentLifecycleRepository,
  PreparedPaymentConfirmation,
  PreparedPaymentOperation,
  PreparedPaymentSession,
} from "../infrastructure/db/PaymentLifecycleRepository.js";

export class PaymentLifecycleService {
  constructor(private readonly dependencies: {
    repository: PaymentLifecycleRepository;
    bindings: PaymentLifecycleMethodBindingsPort;
    accounts: PaymentProviderAccountsPort;
    apps: PaymentsProviderAppsPort;
    settlement: PaymentSettlementConfirmationPort;
  }) {}

  createCollection(params: Payments.CreatePaymentCollectionParams) {
    const parsed = PaymentLifecycleActionSchemas.createCollection.parse(
      params,
    ) as Payments.CreatePaymentCollectionParams;
    return this.dependencies.repository.createCollection(parsed);
  }

  async prepareSession(
    params: Payments.CreatePaymentSessionParams,
  ): Promise<PreparedPaymentSession> {
    params = PaymentLifecycleActionSchemas.createSession.parse(
      params,
    ) as Payments.CreatePaymentSessionParams;
    const effectiveAt = new Date().toISOString();
    if (Date.parse(params.expiresAt) <= Date.parse(effectiveAt)) {
      throw new Error("PAYMENT_SESSION_EXPIRY_INVALID");
    }
    const binding = await this.dependencies.bindings.resolvePaymentSelection({
      storeId: params.storeId,
      checkoutId: params.checkoutId,
      checkoutVersion: params.expectedCheckoutVersion,
      finalQuoteRevision: params.finalQuoteRevision,
      paymentMethodsRevision: params.paymentMethodsRevision,
      methodHandle: params.methodHandle,
      effectiveAt,
    });
    if (!binding) throw new Error("PAYMENT_METHOD_BINDING_NOT_FOUND");

    const account = await this.dependencies.accounts.getById(
      params.storeId,
      binding.providerAccountId,
    );
    if (!account || account.status !== "ACTIVE") {
      throw new Error("PAYMENT_PROVIDER_ACCOUNT_NOT_ACTIVE");
    }
    const sessionKind: Payments.PaymentSessionKind =
      account.captureMode === "MANUAL" ? "AUTHORIZATION" : "SALE";
    if (
      account.organizationId !== params.organizationId ||
      account.configurationRevision !== binding.configurationRevision ||
      !account.supportedCurrencyCodes.includes(params.amount.currencyCode) ||
      !account.supportedSessionKinds.includes(sessionKind) ||
      !account.supportedOperations.includes("createPayment")
    ) {
      throw new Error("PAYMENT_METHOD_BINDING_STALE");
    }
    const route = await this.dependencies.apps.resolveRoute({
      storeId: params.storeId,
      installationId: account.installationId,
      operation: "createPayment",
    });
    if (
      !route ||
      route.installationId !== account.installationId ||
      route.appCode !== account.appCode ||
      route.appVersion !== account.appVersion
    ) {
      throw new Error("PAYMENT_PROVIDER_ROUTE_UNAVAILABLE");
    }

    return this.dependencies.repository.prepareSession({
      params: { ...params, kind: sessionKind },
      binding,
      route,
      requestedAt: effectiveAt,
      deadlineAt: new Date(Date.parse(effectiveAt) + 120_000).toISOString(),
    });
  }

  async invokeProvider(prepared: PreparedPaymentSession) {
    const route = await this.dependencies.apps.resolveRoute({
      storeId: prepared.session.storeId,
      installationId: prepared.route.installationId,
      operation: "createPayment",
    });
    if (
      !route ||
      route.capabilityRouteId !== prepared.route.capabilityRouteId ||
      route.installationId !== prepared.route.installationId ||
      route.operation !== prepared.route.operation ||
      route.routeRevision !== prepared.route.routeRevision ||
      route.appCode !== prepared.route.appCode ||
      route.appVersion !== prepared.route.appVersion
    ) {
      throw new Error("PAYMENT_PROVIDER_ROUTE_CHANGED");
    }
    return this.dependencies.apps.createPayment(route, prepared.request);
  }

  completeInitialOperation(
    prepared: PreparedPaymentSession,
    result: Payments.PaymentProviderOperationResult,
  ) {
    return this.dependencies.repository.completeInitialOperation(prepared, result);
  }

  async requestSettlementConfirmation(
    prepared: PreparedPaymentSession,
  ): Promise<Payments.PaymentSettlementConfirmation> {
    const currentCollection = await this.dependencies.repository.getCollection({
      storeId: prepared.session.storeId,
      paymentCollectionId: prepared.collection.paymentCollectionId,
    });
    const currentSession = await this.dependencies.repository.getSession({
      storeId: prepared.session.storeId,
      paymentSessionId: prepared.session.paymentSessionId,
    });
    const operation = currentSession.operations.find(
      (candidate) => candidate.operationId === prepared.operation.operationId,
    );
    if (
      !operation ||
      operation.state !== "REQUIRES_CONFIRMATION" ||
      currentSession.session.state !== "REQUIRES_CONFIRMATION"
    ) {
      throw new Error("PAYMENT_CONFIRMATION_NOT_REQUIRED");
    }
    const deadlineAt = earlierDeadline(
      currentSession.session.expiresAt,
      currentSession.session.confirmationExpiresAt,
    );
    return this.dependencies.settlement.confirm({
      collection: currentCollection.collection,
      session: currentSession.session,
      operation,
      correlationId: prepared.request.correlationId,
      deadlineAt,
    });
  }

  async getPreparedSessionForConfirmation(input: Readonly<{
    storeId: string;
    paymentSessionId: string;
    operationId: string;
    correlationId: string;
  }>): Promise<PreparedPaymentSession> {
    const currentSession = await this.dependencies.repository.getSession({
      storeId: input.storeId,
      paymentSessionId: input.paymentSessionId,
    });
    const operation = currentSession.operations.find(
      (candidate) => candidate.operationId === input.operationId,
    );
    if (
      !operation ||
      operation.state !== "REQUIRES_CONFIRMATION" ||
      currentSession.session.state !== "REQUIRES_CONFIRMATION" ||
      !currentSession.session.confirmationExpiresAt
    ) {
      throw new Error("PAYMENT_CONFIRMATION_NOT_REQUIRED");
    }
    const currentCollection = await this.dependencies.repository.getCollection({
      storeId: input.storeId,
      paymentCollectionId: currentSession.session.paymentCollectionId,
    });
    return {
      duplicate: false,
      route: operation.route,
      collection: currentCollection.collection,
      session: currentSession.session,
      operation,
      request: {
        protocolVersion: 1,
        operation: "CREATE_PAYMENT",
        operationId: operation.operationId,
        paymentSessionId: currentSession.session.paymentSessionId,
        paymentCollectionId: currentCollection.collection.paymentCollectionId,
        providerAccountId: currentSession.session.method.providerAccountId,
        idempotencyKey: operation.idempotency.key,
        idempotencyRequestHash: operation.idempotency.requestHash,
        correlationId: input.correlationId,
        deadlineAt: currentSession.session.confirmationExpiresAt,
        amount: currentSession.session.amount,
        kind: currentSession.session.kind,
        providerMethodKey: currentSession.session.method.providerMethodKey,
        orderReference: currentSession.session.orderId,
        returnUrl: null,
        customer: null,
        customerInput: null,
      },
    };
  }

  async prepareConfirmation(
    prepared: PreparedPaymentSession,
    confirmation: Payments.PaymentSettlementConfirmation,
  ): Promise<PreparedPaymentConfirmation> {
    const requestedAt = new Date().toISOString();
    if (confirmation.decision === "REJECTED") {
      return this.dependencies.repository.prepareConfirmation({
        initial: prepared,
        confirmation,
        route: { ...prepared.route, operation: "confirmPayment" },
        requestedAt,
        deadlineAt: requestedAt,
        correlationId: prepared.request.correlationId,
      });
    }
    const account = await this.dependencies.accounts.getById(
      prepared.session.storeId,
      prepared.session.method.providerAccountId,
    );
    if (
      !account ||
      account.status !== "ACTIVE" ||
      !account.capabilities.supportsSettlementConfirmation ||
      !account.supportedOperations.includes("confirmPayment")
    ) {
      throw new Error("PAYMENT_PROVIDER_CONFIRMATION_UNAVAILABLE");
    }
    const route = await this.dependencies.apps.resolveRoute({
      storeId: prepared.session.storeId,
      installationId: account.installationId,
      operation: "confirmPayment",
    });
    if (
      !route ||
      route.installationId !== account.installationId ||
      route.appCode !== account.appCode ||
      route.appVersion !== account.appVersion
    ) {
      throw new Error("PAYMENT_PROVIDER_CONFIRMATION_UNAVAILABLE");
    }
    return this.dependencies.repository.prepareConfirmation({
      initial: prepared,
      confirmation,
      route,
      requestedAt,
      deadlineAt: confirmation.expiresAt,
      correlationId: prepared.request.correlationId,
    });
  }

  async invokeConfirmation(prepared: PreparedPaymentConfirmation) {
    if (!prepared.request) throw new Error("PAYMENT_CONFIRMATION_REJECTED");
    const route = await this.dependencies.apps.resolveRoute({
      storeId: prepared.session.storeId,
      installationId: prepared.route.installationId,
      operation: "confirmPayment",
    });
    assertPinnedRoute(route, prepared.route);
    const result = parseProviderOperationResult(
      await this.dependencies.apps.confirmPayment(route, prepared.request),
    );
    if (result.status === "REQUIRES_CONFIRMATION") {
      throw new Error("PAYMENT_PROVIDER_CONFIRMATION_LOOP");
    }
    return result;
  }

  completePreparedConfirmation(
    prepared: PreparedPaymentConfirmation,
    result: Payments.PaymentProviderOperationResult,
  ) {
    if (!prepared.request) throw new Error("PAYMENT_CONFIRMATION_REJECTED");
    return this.dependencies.repository.completePreparedOperation(
      { ...prepared, request: prepared.request },
      result,
    );
  }

  async prepareOperation(
    params:
      | Payments.CancelPaymentParams
      | Payments.CapturePaymentParams
      | Payments.VoidPaymentParams
      | Payments.RefundPaymentParams
      | Payments.ReconcilePaymentParams,
    type: "CANCEL" | "CAPTURE" | "VOID" | "REFUND" | "RECONCILE",
  ): Promise<PreparedPaymentOperation> {
    params = (type === "CANCEL" ? PaymentLifecycleActionSchemas.cancel.parse(params)
      : type === "CAPTURE" ? PaymentLifecycleActionSchemas.capture.parse(params)
      : type === "VOID" ? PaymentLifecycleActionSchemas.void.parse(params)
      : type === "REFUND" ? PaymentLifecycleActionSchemas.refund.parse(params)
      : PaymentLifecycleActionSchemas.reconcile.parse(params)) as typeof params;
    const current = await this.dependencies.repository.getSession({
      storeId: params.storeId,
      paymentSessionId: params.paymentSessionId,
    });
    const account = await this.dependencies.accounts.getById(
      params.storeId,
      current.session.method.providerAccountId,
    );
    const providerOperation = providerOperationFor(type);
    if (
      !account ||
      account.status !== "ACTIVE" ||
      account.organizationId !== current.session.organizationId ||
      !account.supportedOperations.includes(providerOperation)
    ) {
      throw new Error("PAYMENT_PROVIDER_OPERATION_UNAVAILABLE");
    }
    assertProviderCapability(account, current.session, type, "amount" in params ? params.amount : null);
    const route = await this.dependencies.apps.resolveRoute({
      storeId: params.storeId,
      installationId: account.installationId,
      operation: providerOperation,
    });
    if (
      !route ||
      route.installationId !== account.installationId ||
      route.appCode !== account.appCode ||
      route.appVersion !== account.appVersion
    ) {
      throw new Error("PAYMENT_PROVIDER_ROUTE_UNAVAILABLE");
    }
    const requestedAt = new Date().toISOString();
    return this.dependencies.repository.prepareOperation({
      params,
      type,
      route,
      requestedAt,
      deadlineAt: new Date(Date.parse(requestedAt) + 120_000).toISOString(),
    });
  }

  async invokeOperation(prepared: PreparedPaymentOperation) {
    const route = await this.dependencies.apps.resolveRoute({
      storeId: prepared.session.storeId,
      installationId: prepared.route.installationId,
      operation: prepared.route.operation,
    });
    assertPinnedRoute(route, prepared.route);
    switch (prepared.request.operation) {
      case "CANCEL":
        return rejectUnexpectedConfirmation(parseProviderOperationResult(await this.dependencies.apps.cancel(route!, prepared.request)));
      case "CAPTURE":
        return rejectUnexpectedConfirmation(parseProviderOperationResult(await this.dependencies.apps.capture(route!, prepared.request)));
      case "VOID":
        return rejectUnexpectedConfirmation(parseProviderOperationResult(await this.dependencies.apps.void(route!, prepared.request)));
      case "REFUND":
        return rejectUnexpectedConfirmation(parseProviderOperationResult(await this.dependencies.apps.refund(route!, prepared.request)));
      case "RECONCILE":
        return parseProviderReconcileResult(await this.dependencies.apps.reconcile(route!, prepared.request));
      case "CONFIRM":
        return parseProviderOperationResult(await this.dependencies.apps.confirmPayment(route!, prepared.request));
      case "CREATE_PAYMENT":
        throw new Error("PAYMENT_CREATE_OPERATION_MUST_USE_SESSION_WORKFLOW");
    }
  }

  requestOperationSettlement(
    prepared: PreparedPaymentOperation,
  ): Promise<Payments.PaymentSettlementConfirmation> {
    return this.dependencies.settlement.confirm({
      collection: prepared.collection,
      session: prepared.session,
      operation: prepared.operation,
      correlationId: prepared.request.correlationId,
      deadlineAt: prepared.request.deadlineAt,
    });
  }

  applyOperationSettlement(
    prepared: PreparedPaymentOperation,
    confirmation: Payments.PaymentSettlementConfirmation,
  ) {
    return this.dependencies.repository.applyOperationSettlement(
      prepared,
      confirmation,
      new Date().toISOString(),
    );
  }

  completePreparedOperation(
    prepared: PreparedPaymentOperation,
    result: Payments.PaymentProviderOperationResult | Payments.PaymentProviderReconcileResult,
  ) {
    return this.dependencies.repository.completePreparedOperation(prepared, result);
  }

  async completeProviderOperation(
    raw: Payments.CompleteProviderOperationParams,
    context: PaymentProviderCompletionContext,
  ): Promise<Payments.CompleteProviderOperationResult> {
    const expected = await this.dependencies.repository.getProviderCompletionExpectation(
      context.storeId,
      raw.paymentSessionId,
      raw.operationId,
    );
    const params = parseProviderCompletion(raw, {
      context,
      route: expected.operation.route,
      session: expected.session,
      operation: expected.operation,
    });
    const eventHash = contentRevision("payment-provider-completion", params);
    return this.dependencies.repository.completeOperation({
      storeId: context.storeId,
      paymentSessionId: params.paymentSessionId,
      operationId: params.operationId,
      result: params.result,
      providerEvent: {
        providerAccountId: expected.session.method.providerAccountId,
        providerEventId: params.providerEventId,
        eventHash,
        occurredAt: params.occurredAt,
        payload: params as unknown as Record<string, unknown>,
      },
      correlationId: context.correlationId ?? providerCorrelationId(params.providerEventId),
    });
  }

  async reportProviderEvent(
    raw: Payments.ReportPaymentProviderEventParams,
    context: PaymentProviderCompletionContext,
  ): Promise<Payments.ReportPaymentProviderEventResult> {
    const account = await this.dependencies.accounts.getById(
      context.storeId,
      raw.providerAccountId,
    );
    if (!account) throw new Error("PAYMENT_PROVIDER_ACCOUNT_NOT_FOUND");
    const params = parseProviderEvent(raw, { context, account });
    if (params.event.type === "DISPUTE_CHANGED" && !account.capabilities.supportsDisputes) {
      throw new Error("PAYMENT_PROVIDER_DISPUTES_UNSUPPORTED");
    }
    const providerOperation = params.event.type === "PAYMENT_RECONCILED"
      ? "reconcile"
      : "createPayment";
    if (
      params.event.type === "PAYMENT_RECONCILED" &&
      !account.capabilities.supportsReconciliation
    ) {
      throw new Error("PAYMENT_PROVIDER_RECONCILIATION_UNAVAILABLE");
    }
    const route = await this.dependencies.apps.resolveRoute({
      storeId: context.storeId,
      installationId: account.installationId,
      operation: providerOperation,
    });
    if (
      !route ||
      route.installationId !== account.installationId ||
      route.appCode !== account.appCode ||
      route.appVersion !== account.appVersion
    ) {
      throw new Error("PAYMENT_PROVIDER_ROUTE_UNAVAILABLE");
    }
    return this.dependencies.repository.reportProviderEvent({
      params,
      account,
      route,
      eventHash: contentRevision("payment-provider-event", params),
      correlationId: context.correlationId ?? providerCorrelationId(params.providerEventId),
    });
  }

  getCollection(params: Payments.GetPaymentCollectionParams) {
    return this.dependencies.repository.getCollection(params);
  }

  getSession(params: Payments.GetPaymentSessionParams) {
    return this.dependencies.repository.getSession(params);
  }

  expireSession(params: Payments.ExpirePaymentParams) {
    const parsed = PaymentLifecycleActionSchemas.expire.parse(
      params,
    ) as Payments.ExpirePaymentParams;
    return this.dependencies.repository.expireSession(
      parsed,
      new Date().toISOString(),
    );
  }

  failPendingOperation(input: Readonly<{
    storeId: string;
    paymentSessionId: string;
    operationId: string;
    expiresAt: string;
    correlationId: string;
  }>) {
    return this.dependencies.repository.failPendingOperation({
      ...input,
      effectiveAt: new Date().toISOString(),
    });
  }
}

function providerOperationFor(
  type: "CANCEL" | "CAPTURE" | "VOID" | "REFUND" | "RECONCILE",
): Payments.PaymentProviderOperation {
  return type === "CANCEL" ? "cancel"
    : type === "CAPTURE" ? "capture"
    : type === "VOID" ? "void"
    : type === "REFUND" ? "refund"
    : "reconcile";
}

function assertProviderCapability(
  account: Payments.PaymentProviderAccountSnapshot,
  session: Payments.PaymentSessionSnapshot,
  type: "CANCEL" | "CAPTURE" | "VOID" | "REFUND" | "RECONCILE",
  amount: Payments.PaymentCollectionSnapshot["targetAmount"] | null,
): void {
  if (type === "CAPTURE" && !account.capabilities.supportsPartialCapture && amount) {
    const remainder = BigInt(session.authorizedAmount.amountMinor)
      - BigInt(session.capturedAmount.amountMinor)
      - BigInt(session.voidedAmount.amountMinor);
    if (BigInt(amount.amountMinor) !== remainder) {
      throw new Error("PAYMENT_PROVIDER_PARTIAL_CAPTURE_UNSUPPORTED");
    }
  }
  if (
    type === "CAPTURE" &&
    !account.capabilities.supportsMultipleCaptures &&
    BigInt(session.capturedAmount.amountMinor) > 0n
  ) {
    throw new Error("PAYMENT_PROVIDER_MULTIPLE_CAPTURES_UNSUPPORTED");
  }
  if (type === "REFUND" && !account.capabilities.supportsPartialRefund && amount) {
    const remainder = BigInt(session.capturedAmount.amountMinor)
      - BigInt(session.refundedAmount.amountMinor);
    if (BigInt(amount.amountMinor) !== remainder) {
      throw new Error("PAYMENT_PROVIDER_PARTIAL_REFUND_UNSUPPORTED");
    }
  }
  if (
    type === "REFUND" &&
    !account.capabilities.supportsMultipleRefunds &&
    BigInt(session.refundedAmount.amountMinor) > 0n
  ) {
    throw new Error("PAYMENT_PROVIDER_MULTIPLE_REFUNDS_UNSUPPORTED");
  }
  if (type === "RECONCILE" && !account.capabilities.supportsReconciliation) {
    throw new Error("PAYMENT_PROVIDER_RECONCILIATION_UNAVAILABLE");
  }
}

function assertPinnedRoute(
  current: Payments.PaymentProviderRouteSnapshot | null,
  pinned: Payments.PaymentProviderRouteSnapshot,
): asserts current is Payments.PaymentProviderRouteSnapshot {
  if (
    !current ||
    current.capabilityRouteId !== pinned.capabilityRouteId ||
    current.installationId !== pinned.installationId ||
    current.operation !== pinned.operation ||
    current.routeRevision !== pinned.routeRevision ||
    current.appCode !== pinned.appCode ||
    current.appVersion !== pinned.appVersion
  ) {
    throw new Error("PAYMENT_PROVIDER_ROUTE_CHANGED");
  }
}

function earlierDeadline(platformDeadline: string, providerDeadline: string | null): string {
  if (!providerDeadline) throw new Error("PAYMENT_CONFIRMATION_EXPIRY_MISSING");
  return Date.parse(providerDeadline) < Date.parse(platformDeadline)
    ? providerDeadline
    : platformDeadline;
}

function providerCorrelationId(providerEventId: string): string {
  const hash = contentRevision("payment-provider-correlation", providerEventId)
    .replace(/^[^:]*:/, "")
    .replace(/[^0-9a-f]/g, "")
    .padEnd(32, "0")
    .slice(0, 32);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function rejectUnexpectedConfirmation(
  result: Payments.PaymentProviderOperationResult,
): Payments.PaymentProviderOperationResult {
  if (result.status === "REQUIRES_CONFIRMATION") {
    throw new Error("PAYMENT_PROVIDER_RESULT_INVALID");
  }
  return result;
}
