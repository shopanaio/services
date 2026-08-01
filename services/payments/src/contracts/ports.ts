import type { Apps, PaymentEvents, Payments } from "@shopana/broker-types";
import type { PaymentProviderCompletionContext } from "./actions.js";

export interface PaymentsProviderAppsPort {
  listRoutes(
    params: Apps.ListPaymentProviderRoutesParams,
  ): Promise<readonly Payments.PaymentProviderRouteSnapshot[]>;
  resolveRoute(input: Readonly<{
    storeId: string;
    installationId: string;
    operation: Payments.PaymentProviderOperation;
  }>): Promise<Payments.PaymentProviderRouteSnapshot | null>;
  validateConfiguration(
    route: Payments.PaymentProviderRouteSnapshot,
    request: Payments.PaymentProviderConfigurationValidationRequest,
  ): Promise<Payments.PaymentProviderConfigurationValidationResult>;
  getMethods(
    route: Payments.PaymentProviderRouteSnapshot,
    request: Payments.PaymentProviderMethodDiscoveryRequest,
  ): Promise<Payments.PaymentProviderMethodDiscoveryResult>;
  createPayment(
    route: Payments.PaymentProviderRouteSnapshot,
    request: Payments.PaymentProviderCreatePaymentRequest,
  ): Promise<Payments.PaymentProviderOperationResult>;
  confirmPayment(
    route: Payments.PaymentProviderRouteSnapshot,
    request: Payments.PaymentProviderConfirmRequest,
  ): Promise<Payments.PaymentProviderOperationResult>;
  cancel(
    route: Payments.PaymentProviderRouteSnapshot,
    request: Payments.PaymentProviderCancelRequest,
  ): Promise<Payments.PaymentProviderOperationResult>;
  capture(
    route: Payments.PaymentProviderRouteSnapshot,
    request: Payments.PaymentProviderCaptureRequest,
  ): Promise<Payments.PaymentProviderOperationResult>;
  void(
    route: Payments.PaymentProviderRouteSnapshot,
    request: Payments.PaymentProviderVoidRequest,
  ): Promise<Payments.PaymentProviderOperationResult>;
  refund(
    route: Payments.PaymentProviderRouteSnapshot,
    request: Payments.PaymentProviderRefundRequest,
  ): Promise<Payments.PaymentProviderOperationResult>;
  reconcile(
    route: Payments.PaymentProviderRouteSnapshot,
    request: Payments.PaymentProviderReconcileRequest,
  ): Promise<Payments.PaymentProviderReconcileResult>;
}

export interface PaymentProviderAccountsPort {
  listActiveForStore(
    storeId: string,
  ): Promise<readonly Payments.PaymentProviderAccountSnapshot[]>;
  getById(
    storeId: string,
    providerAccountId: string,
  ): Promise<Payments.PaymentProviderAccountSnapshot | null>;
  save(
    account: Payments.PaymentProviderAccountSnapshot,
    expectedConfigurationRevision: string | null,
  ): Promise<
    | Readonly<{
        status: "SAVED";
        account: Payments.PaymentProviderAccountSnapshot;
      }>
    | Readonly<{
        status: "REVISION_CONFLICT";
        current: Payments.PaymentProviderAccountSnapshot;
      }>
  >;
}

export interface PaymentMethodBindingCandidate {
  method: Payments.PaymentsCheckoutMethod;
  binding: Payments.PaymentMethodBindingSnapshot;
}

export interface PaymentMethodBindingsPort {
  replaceCheckoutSnapshot(input: Readonly<{
    storeId: string;
    checkoutId: string;
    checkoutVersion: number;
    finalQuoteRevision: string;
    paymentMethodsRevision: string;
    methods: readonly PaymentMethodBindingCandidate[];
    expiresAt: string;
  }>): Promise<void>;
  resolve(input: Readonly<{
    storeId: string;
    checkoutId: string;
    methodHandle: string;
    paymentMethodsRevision: string;
  }>): Promise<Payments.PaymentMethodBindingSnapshot | null>;
}

export interface CreatePaymentSessionRecord {
  collection: Payments.PaymentCollectionSnapshot;
  session: Payments.PaymentSessionSnapshot;
  initialOperation: Payments.PaymentOperationSnapshot;
}

export interface CompletePaymentOperationRecord {
  storeId: string;
  expectedCollectionRevision: number;
  expectedSessionRevision: number;
  collection: Payments.PaymentCollectionSnapshot;
  operation: Payments.PaymentOperationSnapshot;
  session: Payments.PaymentSessionSnapshot;
  providerEventId: string | null;
  /** Canonical hash rejects reuse of one event ID with different completion data. */
  completionHash: string;
}

export type PaymentIdempotentCreateResult<T> =
  | Readonly<{ status: "CREATED"; record: T }>
  | Readonly<{ status: "DUPLICATE"; record: T }>
  | Readonly<{ status: "IDEMPOTENCY_CONFLICT"; existing: T }>;

/**
 * Payments computes the hash from its parsed business request, never from caller data.
 * normalizedRequest excludes idempotencyKey, correlationId and transport metadata.
 */
export interface PaymentIdempotencyPort {
  createSnapshot(input: Readonly<{
    scope: string;
    key: string;
    normalizedRequest: unknown;
  }>): Payments.PaymentIdempotencySnapshot;
}

export interface PaymentCollectionsPort {
  createIdempotently(
    collection: Payments.PaymentCollectionSnapshot,
    idempotency: Payments.PaymentIdempotencySnapshot,
  ): Promise<PaymentIdempotentCreateResult<Payments.PaymentCollectionSnapshot>>;
  get(
    storeId: string,
    paymentCollectionId: string,
  ): Promise<Payments.PaymentCollectionSnapshot | null>;
  listSessions(
    storeId: string,
    paymentCollectionId: string,
  ): Promise<readonly Payments.PaymentSessionSnapshot[]>;
}

export interface PaymentProviderEventsPort {
  recordIdempotently(input: Readonly<{
    storeId: string;
    providerAccountId: string;
    providerEventId: string;
    eventHash: string;
    occurredAt: string;
  }>): Promise<
    | Readonly<{ status: "RECORDED" }>
    | Readonly<{ status: "DUPLICATE" }>
    | Readonly<{ status: "IDEMPOTENCY_CONFLICT" }>
  >;
}

export interface PaymentDisputesPort {
  getByProviderReference(
    storeId: string,
    providerAccountId: string,
    providerDisputeReference: string,
  ): Promise<Payments.PaymentDisputeSnapshot | null>;
  save(
    dispute: Payments.PaymentDisputeSnapshot,
    expectedRevision: number | null,
  ): Promise<
    | Readonly<{ status: "SAVED"; dispute: Payments.PaymentDisputeSnapshot }>
    | Readonly<{
        status: "REVISION_CONFLICT";
        current: Payments.PaymentDisputeSnapshot;
      }>
  >;
}

/** Persistence port must enforce uniqueness and optimistic session revisions. */
export interface PaymentSessionsPort {
  createIdempotently(
    record: CreatePaymentSessionRecord,
  ): Promise<PaymentIdempotentCreateResult<CreatePaymentSessionRecord>>;
  get(
    storeId: string,
    paymentSessionId: string,
  ): Promise<Payments.PaymentSessionSnapshot | null>;
  findByProviderReference(
    storeId: string,
    providerAccountId: string,
    providerReference: string,
  ): Promise<Payments.PaymentSessionSnapshot | null>;
  listOperations(
    storeId: string,
    paymentSessionId: string,
  ): Promise<readonly Payments.PaymentOperationSnapshot[]>;
  appendOperationAtomically(input: Readonly<{
    storeId: string;
    expectedCollectionRevision: number;
    expectedSessionRevision: number;
    collection: Payments.PaymentCollectionSnapshot;
    session: Payments.PaymentSessionSnapshot;
    operation: Payments.PaymentOperationSnapshot;
  }>): Promise<Readonly<{
    collectionRevision: number;
    sessionRevision: number;
  }>>;
  completeOperationAtomically(
    record: CompletePaymentOperationRecord,
  ): Promise<Readonly<{
    duplicate: boolean;
    collectionRevision: number;
    sessionRevision: number;
  }>>;
}

/** Checkout/inventory authority used before an irreversible provider settlement. */
export interface PaymentSettlementConfirmationPort {
  confirm(input: Readonly<{
    collection: Payments.PaymentCollectionSnapshot;
    session: Payments.PaymentSessionSnapshot;
    operation: Payments.PaymentOperationSnapshot;
    correlationId: string;
    deadlineAt: string;
  }>): Promise<Payments.PaymentSettlementConfirmation>;
}

export type PaymentDomainEvent =
  | Readonly<{
      type: "payment.collection.state_changed";
      payload: PaymentEvents.CollectionStateChanged;
    }>
  | Readonly<{ type: "payment.session.created"; payload: PaymentEvents.SessionCreated }>
  | Readonly<{ type: "payment.requires_action"; payload: PaymentEvents.RequiresAction }>
  | Readonly<{
      type: "payment.requires_confirmation";
      payload: PaymentEvents.RequiresConfirmation;
    }>
  | Readonly<{
      type: "payment.confirmation.completed";
      payload: PaymentEvents.ConfirmationCompleted;
    }>
  | Readonly<{ type: "payment.pending"; payload: PaymentEvents.Pending }>
  | Readonly<{ type: "payment.cancelled"; payload: PaymentEvents.Cancelled }>
  | Readonly<{ type: "payment.authorized"; payload: PaymentEvents.Authorized }>
  | Readonly<{ type: "payment.captured"; payload: PaymentEvents.Captured }>
  | Readonly<{ type: "payment.failed"; payload: PaymentEvents.Failed }>
  | Readonly<{ type: "payment.voided"; payload: PaymentEvents.Voided }>
  | Readonly<{ type: "payment.refunded"; payload: PaymentEvents.Refunded }>
  | Readonly<{ type: "payment.expired"; payload: PaymentEvents.Expired }>
  | Readonly<{
      type: "payment.dispute.changed";
      payload: PaymentEvents.DisputeChanged;
    }>;

/** Implementations append the whole transition batch through one transactional outbox write. */
export interface PaymentEventsPort {
  appendAll(events: readonly PaymentDomainEvent[]): Promise<void>;
}

export interface PaymentWorkflowPort {
  startConfigureProviderAccount(
    params: Payments.ConfigurePaymentProviderAccountParams,
  ): Promise<Payments.ConfigurePaymentProviderAccountResult>;
  startCreateCollection(
    params: Payments.CreatePaymentCollectionParams,
  ): Promise<Payments.CreatePaymentCollectionResult>;
  startCreate(
    params: Payments.CreatePaymentSessionParams,
  ): Promise<Payments.CreatePaymentSessionResult>;
  startCancel(
    params: Payments.CancelPaymentParams,
  ): Promise<Payments.PaymentOperationAcceptedResult>;
  startCapture(
    params: Payments.CapturePaymentParams,
  ): Promise<Payments.PaymentOperationAcceptedResult>;
  startVoid(
    params: Payments.VoidPaymentParams,
  ): Promise<Payments.PaymentOperationAcceptedResult>;
  startRefund(
    params: Payments.RefundPaymentParams,
  ): Promise<Payments.PaymentOperationAcceptedResult>;
  startReconcile(
    params: Payments.ReconcilePaymentParams,
  ): Promise<Payments.PaymentOperationAcceptedResult>;
  startExpire(
    params: Payments.ExpirePaymentParams,
  ): Promise<Payments.PaymentOperationAcceptedResult>;
  startConfirmation(input: Readonly<{
    storeId: string;
    paymentSessionId: string;
    expectedSessionRevision: number;
    triggeringOperationId: string;
    idempotency: Payments.PaymentIdempotencySnapshot;
    correlationId: string;
  }>): Promise<Payments.PaymentOperationAcceptedResult>;
  startProviderCompletion(
    params: Payments.CompleteProviderOperationParams,
    context: PaymentProviderCompletionContext,
  ): Promise<Payments.CompleteProviderOperationResult>;
  startProviderEvent(
    params: Payments.ReportPaymentProviderEventParams,
    context: PaymentProviderCompletionContext,
  ): Promise<Payments.ReportPaymentProviderEventResult>;
}
