import type { DeliveryCheckoutMethodType } from "./delivery.js";
import type {
  FinalizeCheckoutPricingQuoteResult,
  PricingCheckoutEvaluationContext,
  PricingCheckoutJsonObject,
  PricingCheckoutLocation,
  PricingCheckoutMoney,
  PricingCheckoutStageProvenance,
} from "./pricing.js";

export const PaymentsCheckoutActionNames = {
  getAvailableMethods: "getCheckoutAvailablePaymentMethods",
} as const;

export const PaymentsCheckoutActions = {
  getAvailableMethods:
    `payments.${PaymentsCheckoutActionNames.getAvailableMethods}`,
} as const;

/** Capability implemented by installed payment provider Apps. */
export const PAYMENTS_PROVIDER_CAPABILITY = "payments.provider" as const;
export const PAYMENT_METHOD_CUSTOMIZATION_FUNCTION_TARGET =
  "cart.payment-methods.transform.run" as const;
export const PAYMENT_CUSTOMIZATION_MAX_EXECUTIONS = 25;
export const PAYMENT_CUSTOMIZATION_MAX_OPERATIONS = 250;

/**
 * Stable operation contracts declared by a payment provider App manifest.
 * Method discovery may fan out to several installations. Every mutating
 * operation is invoked against the exact installation pinned by the session.
 */
export const PaymentsProviderOperations = {
  validateConfiguration: "validateConfiguration",
  getMethods: "getMethods",
  createPayment: "createPayment",
  confirmPayment: "confirmPayment",
  cancel: "cancel",
  capture: "capture",
  void: "void",
  refund: "refund",
  reconcile: "reconcile",
} as const;

export type PaymentProviderOperation =
  (typeof PaymentsProviderOperations)[keyof typeof PaymentsProviderOperations];

/** Manifest capability fragment declared by payment provider Apps. */
export interface PaymentProviderAppManifestCapability {
  key: typeof PAYMENTS_PROVIDER_CAPABILITY;
  assignmentMode: "store";
  operations: Readonly<{
    validateConfiguration: string;
    getMethods: string;
    createPayment: string;
    confirmPayment?: string;
    cancel?: string;
    capture?: string;
    void?: string;
    refund?: string;
    reconcile?: string;
  }>;
}

/** Platform-owned Payments actions. */
export const PaymentsActionNames = {
  configureProviderAccount: "configurePaymentProviderAccount",
  setProviderAccountStatus: "setPaymentProviderAccountStatus",
  configureMethodCustomization: "configurePaymentMethodCustomization",
  setMethodCustomizationStatus: "setPaymentMethodCustomizationStatus",
  createCollection: "createPaymentCollection",
  getCollection: "getPaymentCollection",
  createSession: "createPaymentSession",
  getSession: "getPaymentSession",
  cancel: "cancelPayment",
  capture: "capturePayment",
  void: "voidPayment",
  refund: "refundPayment",
  reconcile: "reconcilePayment",
  expire: "expirePayment",
  completeProviderOperation: "completeProviderOperation",
  reportProviderEvent: "reportPaymentProviderEvent",
} as const;

export const PaymentsActions = {
  configureProviderAccount:
    `payments.${PaymentsActionNames.configureProviderAccount}`,
  setProviderAccountStatus:
    `payments.${PaymentsActionNames.setProviderAccountStatus}`,
  configureMethodCustomization:
    `payments.${PaymentsActionNames.configureMethodCustomization}`,
  setMethodCustomizationStatus:
    `payments.${PaymentsActionNames.setMethodCustomizationStatus}`,
  createCollection: `payments.${PaymentsActionNames.createCollection}`,
  getCollection: `payments.${PaymentsActionNames.getCollection}`,
  createSession: `payments.${PaymentsActionNames.createSession}`,
  getSession: `payments.${PaymentsActionNames.getSession}`,
  cancel: `payments.${PaymentsActionNames.cancel}`,
  capture: `payments.${PaymentsActionNames.capture}`,
  void: `payments.${PaymentsActionNames.void}`,
  refund: `payments.${PaymentsActionNames.refund}`,
  reconcile: `payments.${PaymentsActionNames.reconcile}`,
  expire: `payments.${PaymentsActionNames.expire}`,
  completeProviderOperation:
    `payments.${PaymentsActionNames.completeProviderOperation}`,
  reportProviderEvent: `payments.${PaymentsActionNames.reportProviderEvent}`,
} as const;

/** Minimum outbound platform permission required by an async provider App. */
export const PAYMENTS_PROVIDER_APP_PERMISSIONS = [
  PaymentsActions.completeProviderOperation,
  PaymentsActions.reportProviderEvent,
] as const;

export interface PaymentsCheckoutMethodSelectionIntent {
  methodHandle: string;
  customerInput: PricingCheckoutJsonObject | null;
}

export interface PaymentsCheckoutDestinationSnapshot {
  destinationId: string;
  location: PricingCheckoutLocation;
}

/** PII-free selected-delivery facts used for payment eligibility. */
export interface PaymentsCheckoutSelectedDeliveryOption {
  handle: string;
  code: string;
  carrierCode: string | null;
  deliveryMethodType: DeliveryCheckoutMethodType;
  cost: PricingCheckoutMoney;
}

export interface PaymentsCheckoutDeliveryGroupSnapshot {
  groupId: string;
  destinationId: string;
  lineIds: readonly string[];
  selectedOption: PaymentsCheckoutSelectedDeliveryOption | null;
}

export interface PaymentsCheckoutDeliverySnapshot
  extends PricingCheckoutStageProvenance {
  revision: string;
  basedOnPreliminaryRevision: string;
  destinations: readonly PaymentsCheckoutDestinationSnapshot[];
  groups: readonly PaymentsCheckoutDeliveryGroupSnapshot[];
}

export interface PaymentsCheckoutMethod {
  handle: string;
  code: string;
  title: string;
  provider: string;
  flow: "ONLINE" | "OFFLINE" | "ON_DELIVERY";
  metadata: PricingCheckoutJsonObject | null;
}

export interface PaymentsCheckoutIssue {
  code: string;
  message: string;
  severity: "WARNING" | "ERROR";
  retryable: boolean;
}

export type PaymentsCheckoutMethodSelectionResolution =
  | Readonly<{ status: "NONE" }>
  | Readonly<{
      status: "SELECTED";
      methodHandle: string;
      customerInput: PricingCheckoutJsonObject | null;
    }>
  | Readonly<{
      status: "RESET";
      previousMethodHandle: string;
      customerInput: PricingCheckoutJsonObject | null;
      reason: Readonly<{ code: string; message: string }>;
    }>;

export interface PaymentsCheckoutEvaluationContext
  extends PricingCheckoutEvaluationContext {
  /** Potential committed version; always the currently committed version + 1. */
  targetCheckoutVersion: number;
}

export interface GetCheckoutAvailablePaymentMethodsParams {
  context: PaymentsCheckoutEvaluationContext;
  selection: PaymentsCheckoutMethodSelectionIntent | null;
  finalQuote: FinalizeCheckoutPricingQuoteResult;
  /** Amount collected by Payments after Checkout applies tender-like loyalty redemption. */
  payableAmount: PricingCheckoutMoney;
  loyaltyRedemption: Readonly<{
    quoteId: string;
    quoteRevision: string;
    discount: PricingCheckoutMoney;
  }> | null;
  /** Minimal, PII-free and provider-data-free delivery eligibility facts. */
  delivery: PaymentsCheckoutDeliverySnapshot;
}

export interface GetCheckoutAvailablePaymentMethodsResult
  extends PricingCheckoutStageProvenance {
  revision: string;
  discoveryRevision: string;
  customizationRevision: string;
  basedOnFinalQuoteRevision: string;
  basedOnLoyaltyQuoteRevision: string | null;
  basedOnDeliveryRevision: string;
  methods: readonly PaymentsCheckoutMethod[];
  selection: PaymentsCheckoutMethodSelectionResolution;
  issues: readonly PaymentsCheckoutIssue[];
}

export type PaymentMethodCustomizationOperation =
  | Readonly<{ type: "HIDE"; methodHandle: string; reasonCode: string }>
  | Readonly<{ type: "MOVE"; methodHandle: string; index: number }>
  | Readonly<{ type: "RENAME"; methodHandle: string; title: string }>;

export interface PaymentMethodCustomizationFunctionInput {
  schemaVersion: 1;
  executionId: string;
  storeId: string;
  checkoutId: string;
  basedOnCheckoutVersion: number;
  targetCheckoutVersion: number;
  currencyCode: string;
  localeCode: string | null;
  channelCode: string;
  effectiveAt: string;
  buyer: Readonly<{
    customerId: string | null;
    countryCode: string | null;
    marketId: string | null;
    companyId: string | null;
    segmentIds: readonly string[];
  }> | null;
  delivery: Readonly<{
    countryCodes: readonly string[];
    selectedCarrierCodes: readonly string[];
  }>;
  amount: PricingCheckoutMoney;
  methods: readonly PaymentsCheckoutMethod[];
}

export interface PaymentMethodCustomizationFunctionResult {
  operations: readonly PaymentMethodCustomizationOperation[];
}

export interface PaymentMethodCustomizationAppManifestCapability {
  key: "commerce.function";
  assignmentMode: "store";
  routingMode: "broadcast";
  operations: Readonly<{
    "cart.payment-methods.transform.run": string;
  }>;
}

// ---------------------------------------------------------------------------
// Provider account and route snapshots
// ---------------------------------------------------------------------------

export type PaymentProviderAccountStatus =
  | "CONFIGURING"
  | "READY"
  | "ACTIVE"
  | "INACTIVE"
  | "DEGRADED"
  | "SUSPENDED";

export type PaymentProviderMode = "TEST" | "LIVE";
export type PaymentCaptureMode = "AUTOMATIC" | "MANUAL";

export interface PaymentProviderCapabilities {
  supportsAsynchronousCompletion: boolean;
  supportsSettlementConfirmation: boolean;
  supportsPartialCapture: boolean;
  supportsMultipleCaptures: boolean;
  supportsPartialRefund: boolean;
  supportsMultipleRefunds: boolean;
  supportsReconciliation: boolean;
  supportsDisputes: boolean;
}

/** Payments-owned link to an Apps installation. Secrets remain Apps-owned. */
export interface PaymentProviderAccountSnapshot {
  providerAccountId: string;
  organizationId: string;
  storeId: string;
  installationId: string;
  appCode: string;
  appVersion: string;
  providerCode: string;
  displayName: string;
  status: PaymentProviderAccountStatus;
  mode: PaymentProviderMode;
  captureMode: PaymentCaptureMode;
  capabilities: PaymentProviderCapabilities;
  configurationRevision: string;
  supportedCurrencyCodes: readonly string[];
  supportedCountryCodes: readonly string[];
  supportedSessionKinds: readonly PaymentSessionKind[];
  supportedOperations: readonly PaymentProviderOperation[];
  enabledMethodKeys: readonly string[];
  createdAt: string;
  updatedAt: string;
}

/** Immutable Apps route used for a provider invocation. */
export interface PaymentProviderRouteSnapshot {
  protocolVersion: typeof PAYMENTS_PROVIDER_PROTOCOL_VERSION;
  capabilityRouteId: string;
  installationId: string;
  appCode: string;
  appVersion: string;
  operation: PaymentProviderOperation;
  routeRevision: string;
}

/** Exact provider binding hidden behind a checkout-facing method handle. */
export interface PaymentMethodBindingSnapshot {
  methodHandle: string;
  providerAccountId: string;
  providerCode: string;
  providerMethodKey: string;
  discoveryRoute: PaymentProviderRouteSnapshot;
  configurationRevision: string;
  providerDiscoveryRevision: string;
}

// ---------------------------------------------------------------------------
// Canonical payment state
// ---------------------------------------------------------------------------

export type PaymentSessionKind = "SALE" | "AUTHORIZATION";

export type PaymentSessionState =
  | "CREATED"
  | "PROCESSING"
  | "REQUIRES_ACTION"
  | "REQUIRES_CONFIRMATION"
  | "PENDING"
  | "AUTHORIZED"
  | "PARTIALLY_CAPTURED"
  | "CAPTURED"
  | "VOIDED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";

export type PaymentCollectionState =
  | "OPEN"
  | "PENDING"
  | "PARTIALLY_AUTHORIZED"
  | "AUTHORIZED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "CANCELLED";

export type PaymentOperationType =
  | "SALE"
  | "AUTHORIZE"
  | "CONFIRM"
  | "CANCEL"
  | "CAPTURE"
  | "VOID"
  | "REFUND"
  | "RECONCILE";

export type PaymentOperationState =
  | "REQUESTED"
  | "PROCESSING"
  | "REQUIRES_ACTION"
  | "REQUIRES_CONFIRMATION"
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "EXPIRED";

/** Canonical transition policy; retries after terminal failure create a new session. */
export const PaymentSessionTransitions = {
  CREATED: ["PROCESSING", "CANCELLED"],
  PROCESSING: [
    "REQUIRES_ACTION",
    "REQUIRES_CONFIRMATION",
    "PENDING",
    "AUTHORIZED",
    "CAPTURED",
    "FAILED",
    "CANCELLED",
  ],
  REQUIRES_ACTION: [
    "PROCESSING",
    "REQUIRES_CONFIRMATION",
    "PENDING",
    "FAILED",
    "EXPIRED",
    "CANCELLED",
  ],
  REQUIRES_CONFIRMATION: [
    "PROCESSING",
    "PENDING",
    "FAILED",
    "EXPIRED",
    "CANCELLED",
  ],
  PENDING: [
    "PROCESSING",
    "AUTHORIZED",
    "CAPTURED",
    "FAILED",
    "EXPIRED",
    "CANCELLED",
  ],
  AUTHORIZED: ["PARTIALLY_CAPTURED", "CAPTURED", "VOIDED"],
  PARTIALLY_CAPTURED: [
    "PARTIALLY_CAPTURED",
    "CAPTURED",
    "PARTIALLY_REFUNDED",
    "REFUNDED",
  ],
  CAPTURED: ["PARTIALLY_REFUNDED", "REFUNDED"],
  PARTIALLY_REFUNDED: ["PARTIALLY_REFUNDED", "REFUNDED"],
  VOIDED: [],
  REFUNDED: [],
  FAILED: [],
  EXPIRED: [],
  CANCELLED: [],
} as const satisfies Record<PaymentSessionState, readonly PaymentSessionState[]>;

export const PaymentOperationTransitions = {
  REQUESTED: ["PROCESSING", "FAILED"],
  PROCESSING: [
    "REQUIRES_ACTION",
    "REQUIRES_CONFIRMATION",
    "PENDING",
    "SUCCEEDED",
    "FAILED",
  ],
  REQUIRES_ACTION: [
    "PROCESSING",
    "REQUIRES_CONFIRMATION",
    "PENDING",
    "SUCCEEDED",
    "FAILED",
    "EXPIRED",
  ],
  REQUIRES_CONFIRMATION: [
    "PROCESSING",
    "PENDING",
    "SUCCEEDED",
    "FAILED",
    "EXPIRED",
  ],
  PENDING: ["PROCESSING", "SUCCEEDED", "FAILED", "EXPIRED"],
  SUCCEEDED: [],
  FAILED: [],
  EXPIRED: [],
} as const satisfies Record<PaymentOperationState, readonly PaymentOperationState[]>;

export type PaymentPendingReason =
  | "BUYER_ACTION"
  | "PROVIDER_PROCESSING"
  | "PAYMENT_NETWORK"
  | "MANUAL_REVIEW"
  | "OFFLINE_PAYMENT"
  | "UNKNOWN";

/** Stable, non-expiring key plus canonical request hash within an explicit scope. */
export interface PaymentIdempotencySnapshot {
  scope: string;
  key: string;
  requestHash: string;
}

export type PaymentSettlementConfirmation =
  | Readonly<{
      decision: "APPROVED";
      confirmationId: string;
      confirmedAt: string;
      expiresAt: string;
      checkoutVersion: number;
      finalQuoteRevision: string;
      inventoryReservationRevision: string | null;
    }>
  | Readonly<{
      decision: "REJECTED";
      confirmationId: string;
      confirmedAt: string;
      failure: PaymentFailure;
    }>;

export type ApprovedPaymentSettlementConfirmation = Extract<
  PaymentSettlementConfirmation,
  { decision: "APPROVED" }
>;

export type PaymentFailureCategory =
  | "DECLINED"
  | "FRAUD_SUSPECTED"
  | "INVALID_REQUEST"
  | "NOT_SUPPORTED"
  | "CONFIGURATION"
  | "AUTHENTICATION"
  | "PROVIDER_UNAVAILABLE"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "UNKNOWN";

export interface PaymentFailure {
  category: PaymentFailureCategory;
  code: string;
  message: string;
  retryable: boolean;
  providerCode: string | null;
}

/** Non-sensitive instrument details safe for receipts and Admin display. */
export type PaymentInstrumentSummary =
  | Readonly<{
      type: "CARD";
      brand: string;
      last4: string;
      expiryMonth: number | null;
      expiryYear: number | null;
    }>
  | Readonly<{
      type: "OTHER";
      displayName: string;
      reference: string | null;
    }>;

export type PaymentCustomerAction =
  | Readonly<{
      type: "REDIRECT";
      url: string;
      expiresAt: string | null;
    }>
  | Readonly<{
      type: "INSTRUCTIONS";
      title: string;
      instructions: string;
      expiresAt: string | null;
      data: PricingCheckoutJsonObject | null;
    }>;

export interface PaymentOperationSnapshot {
  operationId: string;
  paymentSessionId: string;
  type: PaymentOperationType;
  state: PaymentOperationState;
  amount: PricingCheckoutMoney;
  idempotency: PaymentIdempotencySnapshot;
  route: PaymentProviderRouteSnapshot;
  providerReference: string | null;
  networkTransactionId: string | null;
  customerAction: PaymentCustomerAction | null;
  pendingReason: PaymentPendingReason | null;
  pendingExpiresAt: string | null;
  nextReconcileAt: string | null;
  confirmationExpiresAt: string | null;
  confirmation: PaymentSettlementConfirmation | null;
  failure: PaymentFailure | null;
  revision: number;
  requestedAt: string;
  completedAt: string | null;
}

/** Order-level payment aggregate. Sessions are individual provider attempts/tenders. */
export interface PaymentCollectionSnapshot {
  paymentCollectionId: string;
  organizationId: string;
  storeId: string;
  checkoutId: string;
  orderId: string;
  state: PaymentCollectionState;
  targetAmount: PricingCheckoutMoney;
  authorizedAmount: PricingCheckoutMoney;
  capturedAmount: PricingCheckoutMoney;
  refundedAmount: PricingCheckoutMoney;
  outstandingAmount: PricingCheckoutMoney;
  basedOnCheckoutVersion: number;
  basedOnFinalQuoteRevision: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSessionSnapshot {
  paymentSessionId: string;
  paymentCollectionId: string;
  attemptSequence: number;
  organizationId: string;
  storeId: string;
  checkoutId: string;
  orderId: string;
  kind: PaymentSessionKind;
  state: PaymentSessionState;
  amount: PricingCheckoutMoney;
  authorizedAmount: PricingCheckoutMoney;
  capturedAmount: PricingCheckoutMoney;
  refundedAmount: PricingCheckoutMoney;
  voidedAmount: PricingCheckoutMoney;
  method: PaymentMethodBindingSnapshot;
  basedOnCheckoutVersion: number;
  basedOnFinalQuoteRevision: string;
  basedOnPaymentMethodsRevision: string;
  providerReference: string | null;
  authorizationExpiresAt: string | null;
  instrument: PaymentInstrumentSummary | null;
  customerAction: PaymentCustomerAction | null;
  /** Platform deadline for a checkout-owned, non-terminal payment attempt. */
  expiresAt: string;
  pendingReason: PaymentPendingReason | null;
  pendingExpiresAt: string | null;
  nextReconcileAt: string | null;
  confirmationExpiresAt: string | null;
  confirmation: PaymentSettlementConfirmation | null;
  lastFailure: PaymentFailure | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Platform payment actions
// ---------------------------------------------------------------------------

export interface ConfigurePaymentProviderAccountParams {
  organizationId: string;
  storeId: string;
  installationId: string;
  mode: PaymentProviderMode;
  captureMode: PaymentCaptureMode;
  enabledMethodKeys: readonly string[];
  idempotencyKey: string;
  correlationId: string;
}

export interface ConfigurePaymentProviderAccountResult {
  providerAccountId: string;
  workflowId: string;
  duplicate: boolean;
}

export interface SetPaymentProviderAccountStatusParams {
  storeId: string;
  providerAccountId: string;
  expectedConfigurationRevision: string;
  status: "ACTIVE" | "INACTIVE";
  idempotencyKey: string;
  correlationId: string;
}

export interface SetPaymentProviderAccountStatusResult {
  account: PaymentProviderAccountSnapshot;
}

export type PaymentMethodCustomizationStatus = "ACTIVE" | "DISABLED";
export type PaymentMethodCustomizationFailureMode = "REQUIRED" | "OPTIONAL";

export interface PaymentMethodCustomizationSnapshot {
  customizationId: string;
  storeId: string;
  status: PaymentMethodCustomizationStatus;
  policyRevision: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethodCustomizationBindingSnapshot {
  functionBindingId: string;
  storeId: string;
  customizationId: string;
  installationId: string;
  functionKey: string;
  contractVersion: 1;
  precedence: number;
  activationSequence: number;
  failureMode: PaymentMethodCustomizationFailureMode;
  configurationSnapshot: PricingCheckoutJsonObject;
  configurationRevision: string;
  routeRevision: string;
  status: PaymentMethodCustomizationStatus;
  createdAt: string;
  updatedAt: string;
}

/** Desired-state write owned by Payments; Apps only confirms the pinned route. */
export interface ConfigurePaymentMethodCustomizationParams {
  storeId: string;
  customizationId: string;
  functionBindingId: string;
  installationId: string;
  functionKey: string;
  contractVersion: 1;
  precedence: number;
  activationSequence: number;
  failureMode: PaymentMethodCustomizationFailureMode;
  configurationSnapshot: PricingCheckoutJsonObject;
  configurationRevision: string;
  routeRevision: string;
  customizationStatus: PaymentMethodCustomizationStatus;
  bindingStatus: PaymentMethodCustomizationStatus;
}

export interface ConfigurePaymentMethodCustomizationResult {
  customization: PaymentMethodCustomizationSnapshot;
  binding: PaymentMethodCustomizationBindingSnapshot;
}

export interface SetPaymentMethodCustomizationStatusParams {
  storeId: string;
  customizationId: string;
  status: PaymentMethodCustomizationStatus;
}

export interface SetPaymentMethodCustomizationStatusResult {
  customization: PaymentMethodCustomizationSnapshot;
}

export interface CreatePaymentCollectionParams {
  organizationId: string;
  storeId: string;
  checkoutId: string;
  orderId: string;
  expectedCheckoutVersion: number;
  finalQuoteRevision: string;
  targetAmount: PricingCheckoutMoney;
  idempotencyKey: string;
  correlationId: string;
}

export interface CreatePaymentCollectionResult {
  paymentCollectionId: string;
  workflowId: string;
  duplicate: boolean;
}

export interface GetPaymentCollectionParams {
  storeId: string;
  paymentCollectionId: string;
}

export interface GetPaymentCollectionResult {
  collection: PaymentCollectionSnapshot;
  sessions: readonly PaymentSessionSnapshot[];
}

export interface CreatePaymentSessionParams {
  organizationId: string;
  storeId: string;
  checkoutId: string;
  orderId: string;
  paymentCollectionId: string;
  expectedCheckoutVersion: number;
  finalQuoteRevision: string;
  paymentMethodsRevision: string;
  methodHandle: string;
  kind: PaymentSessionKind;
  amount: PricingCheckoutMoney;
  expiresAt: string;
  returnUrl: string | null;
  customer: PaymentProviderCustomerSnapshot | null;
  /** Must never contain PAN, CVV, provider credentials or other secrets. */
  customerInput: PricingCheckoutJsonObject | null;
  idempotencyKey: string;
  correlationId: string;
}

export interface PaymentOperationAcceptedResult {
  paymentCollectionId: string;
  paymentSessionId: string;
  operationId: string;
  workflowId: string;
  duplicate: boolean;
}

export interface CreatePaymentSessionResult
  extends PaymentOperationAcceptedResult {}

export interface GetPaymentSessionParams {
  storeId: string;
  paymentSessionId: string;
}

export interface GetPaymentSessionResult {
  session: PaymentSessionSnapshot;
  operations: readonly PaymentOperationSnapshot[];
}

export interface CapturePaymentParams {
  storeId: string;
  paymentSessionId: string;
  expectedSessionRevision: number;
  amount: PricingCheckoutMoney;
  idempotencyKey: string;
  correlationId: string;
}

export interface CancelPaymentParams {
  storeId: string;
  paymentSessionId: string;
  expectedSessionRevision: number;
  reason: string | null;
  idempotencyKey: string;
  correlationId: string;
}

export interface VoidPaymentParams {
  storeId: string;
  paymentSessionId: string;
  expectedSessionRevision: number;
  reason: string | null;
  idempotencyKey: string;
  correlationId: string;
}

export interface RefundPaymentParams {
  storeId: string;
  paymentSessionId: string;
  expectedSessionRevision: number;
  amount: PricingCheckoutMoney;
  reason: string | null;
  idempotencyKey: string;
  correlationId: string;
}

export interface ReconcilePaymentParams {
  storeId: string;
  paymentSessionId: string;
  expectedSessionRevision: number;
  idempotencyKey: string;
  correlationId: string;
}

export interface ExpirePaymentParams {
  organizationId: string;
  storeId: string;
  paymentSessionId: string;
  expectedSessionRevision: number;
  reason: string;
  idempotencyKey: string;
  correlationId: string;
}

// ---------------------------------------------------------------------------
// Provider App protocol
// ---------------------------------------------------------------------------

export const PAYMENTS_PROVIDER_PROTOCOL_VERSION = 1 as const;

export interface PaymentProviderConfigurationValidationRequest {
  protocolVersion: typeof PAYMENTS_PROVIDER_PROTOCOL_VERSION;
  correlationId: string;
  deadlineAt: string;
  mode: PaymentProviderMode;
}

export interface PaymentProviderConfigurationValidationResult {
  status: "READY" | "DEGRADED" | "INVALID";
  providerCode: string;
  displayName: string;
  supportedCurrencyCodes: readonly string[];
  supportedCountryCodes: readonly string[];
  supportedSessionKinds: readonly PaymentSessionKind[];
  supportedOperations: readonly PaymentProviderOperation[];
  capabilities: PaymentProviderCapabilities;
  failure: PaymentFailure | null;
  configurationRevision: string;
}

export interface PaymentProviderMethodDiscoveryRequest {
  protocolVersion: typeof PAYMENTS_PROVIDER_PROTOCOL_VERSION;
  executionId: string;
  correlationId: string;
  deadlineAt: string;
  amount: PricingCheckoutMoney;
  localeCode: string | null;
  channelCode: string;
  buyerCountryCode: string | null;
  deliveryCountryCodes: readonly string[];
  selectedDeliveryCarrierCodes: readonly string[];
}

export interface PaymentProviderMethodDefinition {
  /** Stable provider-local identifier, for example `card` or `bank_transfer`. */
  methodKey: string;
  code: string;
  title: string;
  flow: "ONLINE" | "OFFLINE" | "ON_DELIVERY";
  supportedSessionKinds: readonly PaymentSessionKind[];
  supportedCaptureModes: readonly PaymentCaptureMode[];
  capabilities: PaymentProviderCapabilities;
  metadata: PricingCheckoutJsonObject | null;
}

export interface PaymentProviderMethodDiscoveryResult {
  revision: string;
  methods: readonly PaymentProviderMethodDefinition[];
}

export interface PaymentProviderAddress {
  countryCode: string;
  provinceCode: string | null;
  postalCode: string | null;
  city: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
}

/** Explicit PII boundary. Provider Apps receive only fields needed to pay. */
export interface PaymentProviderCustomerSnapshot {
  customerReference: string | null;
  email: string | null;
  phone: string | null;
  billingAddress: PaymentProviderAddress | null;
}

export interface PaymentProviderOperationRequestBase {
  protocolVersion: typeof PAYMENTS_PROVIDER_PROTOCOL_VERSION;
  operationId: string;
  paymentSessionId: string;
  paymentCollectionId: string;
  providerAccountId: string;
  idempotencyKey: string;
  /** Payments-computed canonical hash; provider Apps must treat it as opaque. */
  idempotencyRequestHash: string;
  correlationId: string;
  deadlineAt: string;
  amount: PricingCheckoutMoney;
}

export interface PaymentProviderCreatePaymentRequest
  extends PaymentProviderOperationRequestBase {
  operation: "CREATE_PAYMENT";
  kind: PaymentSessionKind;
  providerMethodKey: string;
  orderReference: string;
  returnUrl: string | null;
  customer: PaymentProviderCustomerSnapshot | null;
  /** Must contain only provider-approved non-secret checkout fields. */
  customerInput: PricingCheckoutJsonObject | null;
}

/**
 * Sent only after Payments has revalidated checkout, quote and inventory.
 * A rejected confirmation must never authorize or capture funds.
 */
export interface PaymentProviderConfirmRequest
  extends PaymentProviderOperationRequestBase {
  operation: "CONFIRM";
  providerReference: string;
  confirmation: ApprovedPaymentSettlementConfirmation;
}

export interface PaymentProviderCaptureRequest
  extends PaymentProviderOperationRequestBase {
  operation: "CAPTURE";
  providerReference: string;
}

export interface PaymentProviderCancelRequest
  extends Omit<PaymentProviderOperationRequestBase, "amount"> {
  operation: "CANCEL";
  providerReference: string;
  reason: string | null;
}

export interface PaymentProviderVoidRequest
  extends Omit<PaymentProviderOperationRequestBase, "amount"> {
  operation: "VOID";
  providerReference: string;
  reason: string | null;
}

export interface PaymentProviderRefundRequest
  extends PaymentProviderOperationRequestBase {
  operation: "REFUND";
  providerReference: string;
  reason: string | null;
}

export interface PaymentProviderReconcileRequest
  extends Omit<PaymentProviderOperationRequestBase, "amount"> {
  operation: "RECONCILE";
  providerReference: string;
}

export type PaymentProviderOperationRequest =
  | PaymentProviderCreatePaymentRequest
  | PaymentProviderConfirmRequest
  | PaymentProviderCancelRequest
  | PaymentProviderCaptureRequest
  | PaymentProviderVoidRequest
  | PaymentProviderRefundRequest
  | PaymentProviderReconcileRequest;

export type PaymentProviderOperationResult =
  | Readonly<{
      status: "SUCCEEDED";
      providerReference: string;
      networkTransactionId: string | null;
      authorizationExpiresAt: string | null;
      instrument: PaymentInstrumentSummary | null;
      processedAt: string;
      metadata: PricingCheckoutJsonObject | null;
    }>
  | Readonly<{
      status: "PENDING";
      providerReference: string;
      customerAction: null;
      pendingReason: PaymentPendingReason;
      pendingExpiresAt: string;
      nextReconcileAt: string | null;
      observedAt: string;
      metadata: PricingCheckoutJsonObject | null;
    }>
  | Readonly<{
      status: "REQUIRES_ACTION";
      providerReference: string;
      customerAction: PaymentCustomerAction;
      observedAt: string;
      metadata: PricingCheckoutJsonObject | null;
    }>
  | Readonly<{
      status: "REQUIRES_CONFIRMATION";
      providerReference: string;
      confirmationExpiresAt: string;
      observedAt: string;
      metadata: PricingCheckoutJsonObject | null;
    }>
  | Readonly<{
      status: "FAILED";
      providerReference: string | null;
      failure: PaymentFailure;
      failedAt: string;
      metadata: PricingCheckoutJsonObject | null;
    }>;

export type PaymentProviderReconciledState =
  | "PENDING"
  | "AUTHORIZED"
  | "PARTIALLY_CAPTURED"
  | "CAPTURED"
  | "VOIDED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "CANCELLED"
  | "EXPIRED"
  | "FAILED";

interface PaymentProviderReconcileResultBase {
  status: "RECONCILED";
  providerReference: string;
  authorizedAmount: PricingCheckoutMoney;
  capturedAmount: PricingCheckoutMoney;
  refundedAmount: PricingCheckoutMoney;
  voidedAmount: PricingCheckoutMoney;
  networkTransactionId: string | null;
  observedAt: string;
  metadata: PricingCheckoutJsonObject | null;
}

export type PaymentProviderReconcileResult =
  | Readonly<
      PaymentProviderReconcileResultBase & {
        state: "PENDING";
        pendingReason: PaymentPendingReason;
        pendingExpiresAt: string;
      }
    >
  | Readonly<
      PaymentProviderReconcileResultBase & {
        state: Exclude<PaymentProviderReconciledState, "PENDING">;
        pendingReason: null;
        pendingExpiresAt: null;
      }
    >;

export type PaymentDisputeState =
  | "NEEDS_RESPONSE"
  | "UNDER_REVIEW"
  | "WON"
  | "LOST"
  | "ACCEPTED"
  | "CLOSED";

export interface PaymentDisputeSnapshot {
  paymentDisputeId: string;
  paymentCollectionId: string;
  paymentSessionId: string;
  providerAccountId: string;
  providerDisputeReference: string;
  providerReference: string;
  amount: PricingCheckoutMoney;
  reasonCode: string;
  state: PaymentDisputeState;
  responseDueAt: string | null;
  revision: number;
  openedAt: string;
  updatedAt: string;
}

export type PaymentProviderExternalEvent =
  | Readonly<{
      type: "PAYMENT_RECONCILED";
      result: PaymentProviderReconcileResult;
    }>
  | Readonly<{
      type: "DISPUTE_CHANGED";
      providerDisputeReference: string;
      providerReference: string;
      amount: PricingCheckoutMoney;
      reasonCode: string;
      state: PaymentDisputeState;
      responseDueAt: string | null;
      metadata: PricingCheckoutJsonObject | null;
    }>;

/** Typed handler surface implemented by every payment provider App. */
export interface PaymentProviderAppContract {
  validateConfiguration(
    request: PaymentProviderConfigurationValidationRequest,
  ): Promise<PaymentProviderConfigurationValidationResult>;
  getMethods(
    request: PaymentProviderMethodDiscoveryRequest,
  ): Promise<PaymentProviderMethodDiscoveryResult>;
  createPayment(
    request: PaymentProviderCreatePaymentRequest,
  ): Promise<PaymentProviderOperationResult>;
  confirmPayment?(
    request: PaymentProviderConfirmRequest,
  ): Promise<PaymentProviderOperationResult>;
  cancel?(
    request: PaymentProviderCancelRequest,
  ): Promise<PaymentProviderOperationResult>;
  capture?(
    request: PaymentProviderCaptureRequest,
  ): Promise<PaymentProviderOperationResult>;
  void?(
    request: PaymentProviderVoidRequest,
  ): Promise<PaymentProviderOperationResult>;
  refund?(
    request: PaymentProviderRefundRequest,
  ): Promise<PaymentProviderOperationResult>;
  reconcile?(
    request: PaymentProviderReconcileRequest,
  ): Promise<PaymentProviderReconcileResult>;
}

/** Local action mapping paired with the typed provider handler surface. */
export interface PaymentProviderAppDefinition {
  capability: PaymentProviderAppManifestCapability;
  handlers: PaymentProviderAppContract;
}

interface CompleteProviderOperationParamsBase {
  protocolVersion: typeof PAYMENTS_PROVIDER_PROTOCOL_VERSION;
  paymentSessionId: string;
  operationId: string;
  providerEventId: string;
  occurredAt: string;
}

/** Operation and result are coupled so invalid callback combinations are unrepresentable. */
export type CompleteProviderOperationParams =
  | Readonly<
      CompleteProviderOperationParamsBase & {
        operationType: Exclude<PaymentOperationType, "RECONCILE">;
        result: PaymentProviderOperationResult;
      }
    >
  | Readonly<
      CompleteProviderOperationParamsBase & {
        operationType: "RECONCILE";
        result: PaymentProviderReconcileResult;
      }
    >;

export interface CompleteProviderOperationResult {
  accepted: true;
  duplicate: boolean;
  collectionRevision: number;
  sessionRevision: number;
}

export interface ReportPaymentProviderEventParams {
  protocolVersion: typeof PAYMENTS_PROVIDER_PROTOCOL_VERSION;
  providerAccountId: string;
  providerEventId: string;
  occurredAt: string;
  event: PaymentProviderExternalEvent;
}

export interface ReportPaymentProviderEventResult {
  accepted: true;
  duplicate: boolean;
  paymentSessionId: string;
  collectionRevision: number;
  sessionRevision: number;
}
