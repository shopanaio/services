import type {
  CalculateCheckoutPreliminaryQuoteResult,
  PricingCheckoutJsonObject,
  PricingCheckoutMoney,
  PricingCheckoutStageProvenance,
} from "./pricing.js";

export type * from "./delivery-configuration.js";
export {
  DELIVERY_CUSTOMIZATION_FUNCTION_TARGET,
} from "./delivery-customization.js";
export type * from "./delivery-customization.js";
export type * from "./delivery-fulfillment.js";

export const DeliveryCheckoutActionNames = {
  calculateOptions: "calculateCheckoutDeliveryOptions",
} as const;

export const DeliveryCheckoutActions = {
  calculateOptions:
    `delivery.${DeliveryCheckoutActionNames.calculateOptions}`,
} as const;

/** Capability implemented by installed delivery provider Apps. */
export const DELIVERY_PROVIDER_CAPABILITY = "delivery.provider" as const;

/** Version of the platform-to-provider delivery protocol. */
export const DELIVERY_PROVIDER_PROTOCOL_VERSION = 1 as const;

/** Stable operation contracts declared by every delivery provider App. */
export const DeliveryProviderOperations = {
  validateConfiguration: "validateConfiguration",
  quoteRates: "quoteRates",
  searchLocations: "searchLocations",
  resolveLocation: "resolveLocation",
  createShipment: "createShipment",
  cancelShipment: "cancelShipment",
  getShipment: "getShipment",
  reconcileShipment: "reconcileShipment",
} as const;

export type DeliveryProviderOperation =
  (typeof DeliveryProviderOperations)[keyof typeof DeliveryProviderOperations];

/** Manifest capability fragment declared by delivery provider Apps. */
export interface DeliveryProviderAppManifestCapability {
  key: typeof DELIVERY_PROVIDER_CAPABILITY;
  assignmentMode: "store";
  routingMode: "broadcast";
  operations: Readonly<{
    validateConfiguration: string;
    quoteRates: string;
    searchLocations?: string;
    resolveLocation?: string;
    createShipment: string;
    cancelShipment?: string;
    getShipment?: string;
    reconcileShipment?: string;
  }>;
}

/** Platform-owned delivery lifecycle actions. */
export const DeliveryActionNames = {
  configureProviderAccount: "configureDeliveryProviderAccount",
  setProviderAccountStatus: "setDeliveryProviderAccountStatus",
  getProviderAccount: "getDeliveryProviderAccount",
  searchPickupLocations: "searchDeliveryPickupLocations",
  resolvePickupLocation: "resolveDeliveryPickupLocation",
  createShipment: "createDeliveryShipment",
  cancelShipment: "cancelDeliveryShipment",
  getShipment: "getDeliveryShipment",
  reconcileShipment: "reconcileDeliveryShipment",
  completeProviderOperation: "completeDeliveryProviderOperation",
  reportProviderEvent: "reportDeliveryProviderEvent",
} as const;

export const DeliveryActions = {
  configureProviderAccount:
    `delivery.${DeliveryActionNames.configureProviderAccount}`,
  setProviderAccountStatus:
    `delivery.${DeliveryActionNames.setProviderAccountStatus}`,
  getProviderAccount: `delivery.${DeliveryActionNames.getProviderAccount}`,
  searchPickupLocations:
    `delivery.${DeliveryActionNames.searchPickupLocations}`,
  resolvePickupLocation:
    `delivery.${DeliveryActionNames.resolvePickupLocation}`,
  createShipment: `delivery.${DeliveryActionNames.createShipment}`,
  cancelShipment: `delivery.${DeliveryActionNames.cancelShipment}`,
  getShipment: `delivery.${DeliveryActionNames.getShipment}`,
  reconcileShipment: `delivery.${DeliveryActionNames.reconcileShipment}`,
  completeProviderOperation:
    `delivery.${DeliveryActionNames.completeProviderOperation}`,
  reportProviderEvent: `delivery.${DeliveryActionNames.reportProviderEvent}`,
} as const;

/** Minimum outbound permissions required by an asynchronous provider App. */
export const DELIVERY_PROVIDER_APP_PERMISSIONS = [
  DeliveryActions.completeProviderOperation,
  DeliveryActions.reportProviderEvent,
] as const;

export interface DeliveryCheckoutEvaluationContext {
  executionId: string;
  correlationId: string;
  deadlineAt: string;
  requestedAt: string;
  checkoutId: string;
  expectedCheckoutVersion: number;
  storeId: string;
  currencyCode: string;
  localeCode: string | null;
  channelCode: string;
  effectiveAt: string;
}

/** Delivery receives contact/address PII only for carrier option resolution. */
export interface DeliveryCheckoutAddress {
  id: string;
  address1: string;
  address2: string | null;
  city: string;
  countryCode: string;
  provinceCode: string | null;
  provinceName: string | null;
  postalCode: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  providerData: PricingCheckoutJsonObject | null;
}

export interface DeliveryCheckoutDestinationIntent {
  destinationId: string;
  address: DeliveryCheckoutAddress;
  lineIds: readonly string[];
}

export interface DeliveryCheckoutOptionSelectionIntent {
  groupId: string;
  optionHandle: string;
  customerInput: PricingCheckoutJsonObject | null;
}

export type DeliveryCheckoutMethodType = "PICKUP" | "SHIPPING";
export type DeliveryCheckoutShippingPaymentModel =
  | "MERCHANT_COLLECTED"
  | "CARRIER_DIRECT";

export interface DeliveryCheckoutOption {
  handle: string;
  source: "STATIC" | "PROVIDER";
  profileId: string;
  methodDefinitionId: string;
  code: string;
  title: string;
  description: string | null;
  deliveryMethodType: DeliveryCheckoutMethodType;
  shippingPaymentModel: DeliveryCheckoutShippingPaymentModel;
  provider: Readonly<{
    code: string;
    data: PricingCheckoutJsonObject;
  }>;
  cost: PricingCheckoutMoney;
  estimatedMinDeliveryAt: string | null;
  estimatedMaxDeliveryAt: string | null;
  phoneRequired: boolean;
  customerInputContract: DeliveryCustomerInputContract | null;
}

export type DeliveryCheckoutOptionSelectionResolution =
  | Readonly<{ status: "NONE" }>
  | Readonly<{
      status: "SELECTED";
      optionHandle: string;
      customerInput: PricingCheckoutJsonObject | null;
    }>
  | Readonly<{
      status: "RESET";
      previousOptionHandle: string;
      customerInput: PricingCheckoutJsonObject | null;
      reason: Readonly<{ code: string; message: string }>;
    }>;

export interface DeliveryCheckoutGroup {
  groupId: string;
  destinationId: string;
  lineIds: readonly string[];
  options: readonly DeliveryCheckoutOption[];
  selection: DeliveryCheckoutOptionSelectionResolution;
}

export interface DeliveryCheckoutOrphanedSelectionReset {
  groupId: string;
  previousOptionHandle: string;
  customerInput: PricingCheckoutJsonObject | null;
  reason: Readonly<{ code: string; message: string }>;
}

export interface DeliveryCheckoutProviderExecution {
  groupId: string;
  providerAccountId: string;
  route: DeliveryProviderRouteSnapshot & Readonly<{ operation: "quoteRates" }>;
  status:
    | "SUCCEEDED"
    | "NO_SERVICE"
    | "FAILED"
    | "TIMED_OUT"
    | "FALLBACK_APPLIED";
  rateCount: number;
  durationMs: number;
  failure: DeliveryProviderFailure | null;
}

export interface DeliveryCheckoutIssue {
  severity: "WARNING" | "ERROR";
  code: string;
  message: string;
  groupId: string | null;
  providerAccountId: string | null;
  retryable: boolean;
}

export interface CalculateCheckoutDeliveryOptionsParams {
  context: DeliveryCheckoutEvaluationContext;
  preliminary: CalculateCheckoutPreliminaryQuoteResult;
  destinations: readonly DeliveryCheckoutDestinationIntent[];
  selections: readonly DeliveryCheckoutOptionSelectionIntent[];
}

export interface CalculateCheckoutDeliveryOptionsResult
  extends PricingCheckoutStageProvenance {
  revision: string;
  basedOnPreliminaryRevision: string;
  ratePlanRevision: string;
  eligibilityRevision: string;
  customizationRevision: string;
  groups: readonly DeliveryCheckoutGroup[];
  orphanedSelectionResets: readonly DeliveryCheckoutOrphanedSelectionReset[];
  providerExecutions: readonly DeliveryCheckoutProviderExecution[];
  issues: readonly DeliveryCheckoutIssue[];
}

// ---------------------------------------------------------------------------
// Provider accounts, immutable routes and checkout bindings
// ---------------------------------------------------------------------------

export type DeliveryProviderAccountStatus =
  | "CONFIGURING"
  | "READY"
  | "ACTIVE"
  | "INACTIVE"
  | "DEGRADED"
  | "SUSPENDED";

export type DeliveryProviderMode = "TEST" | "LIVE";

export interface DeliveryProviderCapabilities {
  supportsPickupLocations: boolean;
  supportsDoorDelivery: boolean;
  supportsCarrierCollectedPayment: boolean;
  supportsMerchantCollectedPayment: boolean;
  supportsLabels: boolean;
  supportsMultipleParcels: boolean;
  supportsInternationalShipping: boolean;
  supportsCustomsDeclarations: boolean;
  supportsScheduledDelivery: boolean;
  supportsCancellation: boolean;
  supportsTracking: boolean;
  supportsReconciliation: boolean;
  supportsAsyncCompletion: boolean;
}

/** Delivery-owned link to an Apps installation. Secrets remain Apps-owned. */
export interface DeliveryProviderAccountSnapshot {
  providerAccountId: string;
  organizationId: string;
  storeId: string;
  installationId: string;
  appCode: string;
  appVersion: string;
  providerCode: string;
  displayName: string;
  status: DeliveryProviderAccountStatus;
  mode: DeliveryProviderMode;
  capabilities: DeliveryProviderCapabilities;
  /** Platform-owned optimistic concurrency revision. */
  revision: number;
  /** Provider-owned configuration fingerprint; never used as entity CAS. */
  configurationRevision: string;
  createdAt: string;
  updatedAt: string;
}

/** Immutable Apps route pinned to a quote or shipment operation. */
export interface DeliveryProviderRouteSnapshot {
  protocolVersion: typeof DELIVERY_PROVIDER_PROTOCOL_VERSION;
  capabilityRouteId: string;
  installationId: string;
  appCode: string;
  appVersion: string;
  operation: DeliveryProviderOperation;
  routeRevision: string;
}

export interface DeliveryOptionBindingSnapshotBase {
  optionHandle: string;
  checkoutId: string;
  checkoutVersion: number;
  groupId: string;
  profileId: string;
  methodDefinitionId: string;
  preliminaryRevision: string;
  ratePlanRevision: string;
  eligibilityRevision: string;
  customizationRevision: string;
  /** Hash of origin, destination, packages, currency and checkout version. */
  ratedFactsHash: string;
  customerInputContract: DeliveryCustomerInputContract | null;
  expiresAt: string;
}

/** Exact provider binding hidden behind a checkout-facing option handle. */
export interface DeliveryProviderOptionBindingSnapshot
  extends DeliveryOptionBindingSnapshotBase {
  source: "PROVIDER";
  providerAccountId: string;
  providerCode: string;
  providerServiceCode: string;
  providerQuoteToken: string;
  quoteRoute: DeliveryProviderRouteSnapshot &
    Readonly<{ operation: "quoteRates" }>;
  configurationRevision: string;
  quoteRevision: string;
}

/** Merchant-owned rate which does not imply a provider shipment integration. */
export interface DeliveryStaticOptionBindingSnapshot
  extends DeliveryOptionBindingSnapshotBase {
  source: "STATIC";
  staticRateRevision: number;
}

export type DeliveryOptionBindingSnapshot =
  | DeliveryProviderOptionBindingSnapshot
  | DeliveryStaticOptionBindingSnapshot;

// ---------------------------------------------------------------------------
// Canonical shipping facts shared with provider Apps
// ---------------------------------------------------------------------------

export interface DeliveryProviderMoney {
  amountMinor: string;
  currencyCode: string;
}

export interface DeliveryProviderDimensionsMm {
  width: number;
  height: number;
  length: number;
}

export interface DeliveryProviderPackageItem {
  lineId: string;
  variantId: string;
  sku: string | null;
  title: string;
  quantity: number;
  weightGrams: number;
  dimensionsMm: DeliveryProviderDimensionsMm | null;
  declaredValue: DeliveryProviderMoney;
  customs: DeliveryProviderCustomsItem | null;
  /** Provider-safe product classification; never contains secrets. */
  metadata: PricingCheckoutJsonObject | null;
}

export interface DeliveryProviderCustomsItem {
  harmonizedSystemCode: string | null;
  countryOfOriginCode: string;
  description: string;
}

export interface DeliveryProviderCustomsDeclaration {
  contentsType:
    | "MERCHANDISE"
    | "GIFT"
    | "DOCUMENTS"
    | "SAMPLE"
    | "RETURNED_GOODS"
    | "OTHER";
  incoterm: "DAP" | "DDP" | "DDU";
  nonDeliveryOption: "RETURN_TO_SENDER" | "ABANDON";
  signer: string | null;
}

export interface DeliveryProviderPackage {
  packageId: string;
  weightGrams: number;
  dimensionsMm: DeliveryProviderDimensionsMm | null;
  declaredValue: DeliveryProviderMoney;
  items: readonly DeliveryProviderPackageItem[];
  customs: DeliveryProviderCustomsDeclaration | null;
}

export interface DeliveryProviderLocationAddress {
  countryCode: string;
  provinceCode: string | null;
  provinceName: string | null;
  city: string;
  postalCode: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
}

/** Sender/recipient PII boundary used only for shipment creation. */
export interface DeliveryProviderContact {
  firstName: string;
  middleName: string | null;
  lastName: string;
  company: string | null;
  email: string | null;
  phone: string | null;
}

export interface DeliveryProviderOrigin {
  fulfillmentLocationId: string;
  warehouseId: string | null;
  address: DeliveryProviderLocationAddress;
}

export interface DeliveryProviderDestination {
  destinationId: string;
  address: DeliveryProviderLocationAddress;
}

export type DeliveryProviderFailureCategory =
  | "INVALID_REQUEST"
  | "NOT_SUPPORTED"
  | "NO_SERVICE"
  | "CONFIGURATION"
  | "AUTHENTICATION"
  | "PROVIDER_UNAVAILABLE"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "REJECTED"
  | "UNKNOWN";

export interface DeliveryProviderFailure {
  category: DeliveryProviderFailureCategory;
  code: string;
  message: string;
  retryable: boolean;
  /** True means a retry may duplicate an externally accepted mutation. */
  acceptedByProvider: boolean;
  providerCode: string | null;
}

export interface DeliveryCustomerInputContract {
  schemaDialect: "https://json-schema.org/draft/2020-12/schema";
  schema: PricingCheckoutJsonObject;
  schemaHash: string;
}

// ---------------------------------------------------------------------------
// Provider App protocol: configuration and checkout rate discovery
// ---------------------------------------------------------------------------

export interface DeliveryProviderConfigurationValidationRequest {
  protocolVersion: typeof DELIVERY_PROVIDER_PROTOCOL_VERSION;
  correlationId: string;
  deadlineAt: string;
  mode: DeliveryProviderMode;
}

export interface DeliveryProviderConfigurationValidationResult {
  status: "READY" | "DEGRADED" | "INVALID";
  providerCode: string;
  displayName: string;
  supportedCountryCodes: readonly string[];
  supportedCurrencyCodes: readonly string[];
  supportedOperations: readonly DeliveryProviderOperation[];
  capabilities: DeliveryProviderCapabilities;
  failure: DeliveryProviderFailure | null;
  configurationRevision: string;
}

export interface DeliveryProviderRateRequest {
  protocolVersion: typeof DELIVERY_PROVIDER_PROTOCOL_VERSION;
  quoteRequestId: string;
  executionId: string;
  correlationId: string;
  deadlineAt: string;
  effectiveAt: string;
  storeId: string;
  checkoutId: string;
  checkoutVersion: number;
  groupId: string;
  ratePlanRevision: string;
  eligibilityRevision: string;
  /** Canonical platform hash repeated in the selected option binding. */
  ratedFactsHash: string;
  currencyCode: string;
  localeCode: string | null;
  channelCode: string;
  origin: DeliveryProviderOrigin;
  destination: DeliveryProviderDestination;
  packages: readonly DeliveryProviderPackage[];
}

export interface DeliveryProviderRateDefinition {
  /** Stable provider-local service identifier. */
  serviceCode: string;
  title: string;
  description: string | null;
  deliveryMethodType: DeliveryCheckoutMethodType;
  shippingPaymentModel: DeliveryCheckoutShippingPaymentModel;
  cost: DeliveryProviderMoney;
  estimatedMinDeliveryAt: string | null;
  estimatedMaxDeliveryAt: string | null;
  phoneRequired: boolean;
  /** Opaque token passed back only to the same provider installation. */
  quoteToken: string;
  expiresAt: string;
  /** Versioned and hash-bound customer input descriptor. */
  customerInputContract: DeliveryCustomerInputContract | null;
  publicData: PricingCheckoutJsonObject;
}

export interface DeliveryProviderRateResult {
  quoteRequestId: string;
  revision: string;
  rates: readonly DeliveryProviderRateDefinition[];
  warnings: readonly Readonly<{ code: string; message: string }>[];
  failure: DeliveryProviderFailure | null;
}

// ---------------------------------------------------------------------------
// Provider App protocol: pickup locations
// ---------------------------------------------------------------------------

export type DeliveryPickupLocationType =
  | "BRANCH"
  | "LOCKER"
  | "STORE"
  | "OTHER";

export interface DeliveryProviderLocationSearchRequest {
  protocolVersion: typeof DELIVERY_PROVIDER_PROTOCOL_VERSION;
  requestId: string;
  correlationId: string;
  deadlineAt: string;
  localeCode: string | null;
  countryCode: string;
  provinceCode: string | null;
  city: string | null;
  postalCode: string | null;
  query: string | null;
  locationTypes: readonly DeliveryPickupLocationType[];
  first: number;
  after: string | null;
}

export interface DeliveryProviderPickupLocation {
  locationToken: string;
  tokenExpiresAt: string | null;
  providerLocationId: string;
  type: DeliveryPickupLocationType;
  name: string;
  address: DeliveryProviderLocationAddress;
  latitude: number | null;
  longitude: number | null;
  openingHours: PricingCheckoutJsonObject | null;
  publicData: PricingCheckoutJsonObject;
}

export interface DeliveryProviderLocationSearchResult {
  requestId: string;
  locations: readonly DeliveryProviderPickupLocation[];
  pageInfo: Readonly<{
    hasNextPage: boolean;
    endCursor: string | null;
  }>;
  failure: DeliveryProviderFailure | null;
}

export interface DeliveryProviderLocationResolveRequest {
  protocolVersion: typeof DELIVERY_PROVIDER_PROTOCOL_VERSION;
  requestId: string;
  correlationId: string;
  deadlineAt: string;
  localeCode: string | null;
  locationToken: string;
}

export interface DeliveryProviderLocationResolveResult {
  requestId: string;
  location: DeliveryProviderPickupLocation | null;
  failure: DeliveryProviderFailure | null;
}

// ---------------------------------------------------------------------------
// Canonical shipment state and platform actions
// ---------------------------------------------------------------------------

export type DeliveryShipmentState =
  | "CREATED"
  | "SUBMITTING"
  | "PENDING"
  | "ACCEPTED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "DELIVERY_FAILED"
  | "RETURNING"
  | "RETURNED"
  | "CANCELLING"
  | "CANCELLED"
  | "FAILED";

/** Platform-owned monotonic state machine; providers report observations only. */
export const DeliveryShipmentTransitions = {
  CREATED: ["SUBMITTING", "CANCELLED", "FAILED"],
  SUBMITTING: ["PENDING", "ACCEPTED", "CANCELLING", "FAILED"],
  PENDING: ["ACCEPTED", "CANCELLING", "CANCELLED", "FAILED"],
  ACCEPTED: ["IN_TRANSIT", "CANCELLING", "CANCELLED", "FAILED"],
  IN_TRANSIT: [
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "DELIVERY_FAILED",
    "RETURNING",
  ],
  OUT_FOR_DELIVERY: ["DELIVERED", "DELIVERY_FAILED", "RETURNING"],
  DELIVERED: ["RETURNING"],
  DELIVERY_FAILED: ["IN_TRANSIT", "OUT_FOR_DELIVERY", "RETURNING", "RETURNED"],
  RETURNING: ["RETURNED", "DELIVERY_FAILED"],
  RETURNED: [],
  CANCELLING: ["CANCELLED", "ACCEPTED", "IN_TRANSIT", "FAILED"],
  CANCELLED: [],
  FAILED: ["SUBMITTING", "CANCELLING"],
} as const satisfies Readonly<
  Record<DeliveryShipmentState, readonly DeliveryShipmentState[]>
>;

export type DeliveryShipmentOperationType =
  | "CREATE"
  | "CANCEL"
  | "GET"
  | "RECONCILE";

export type DeliveryShipmentOperationState =
  | "REQUESTED"
  | "PROCESSING"
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED";

export interface DeliveryIdempotencySnapshot {
  scope: string;
  key: string;
  requestHash: string;
}

export interface DeliveryLabelSnapshot {
  format: "PDF" | "PNG" | "ZPL";
  mediaId: string | null;
  downloadUrl: string | null;
  expiresAt: string | null;
}

export interface DeliveryTrackingEventSnapshot {
  providerEventId: string;
  parcelId: string | null;
  providerParcelReference: string | null;
  statusCode: string;
  state: DeliveryShipmentState;
  message: string | null;
  location: DeliveryProviderLocationAddress | null;
  occurredAt: string;
}

export interface DeliveryTrackingSnapshot {
  company: string | null;
  number: string;
  url: string | null;
}

export interface DeliveryParcelSnapshot {
  parcelId: string;
  providerParcelReference: string | null;
  packageIds: readonly string[];
  state: DeliveryShipmentState;
  tracking: readonly DeliveryTrackingSnapshot[];
  labels: readonly DeliveryLabelSnapshot[];
  estimatedDeliveryAt: string | null;
  deliveredAt: string | null;
}

export interface DeliveryShipmentOperationSnapshot {
  operationId: string;
  shipmentId: string;
  type: DeliveryShipmentOperationType;
  state: DeliveryShipmentOperationState;
  idempotency: DeliveryIdempotencySnapshot;
  route: DeliveryProviderRouteSnapshot;
  providerShipmentReference: string | null;
  failure: DeliveryProviderFailure | null;
  revision: number;
  requestedAt: string;
  completedAt: string | null;
}

export interface DeliveryShipmentSnapshot {
  shipmentId: string;
  organizationId: string;
  storeId: string;
  orderId: string;
  fulfillmentId: string;
  fulfillmentRevision: number;
  fulfillmentPlanHash: string;
  checkoutId: string;
  deliveryGroupId: string;
  ratedFactsHash: string;
  state: DeliveryShipmentState;
  providerAccountId: string;
  providerCode: string;
  providerShipmentReference: string | null;
  parcels: readonly DeliveryParcelSnapshot[];
  selectedOption: DeliveryProviderOptionBindingSnapshot;
  customerInput: PricingCheckoutJsonObject | null;
  customerInputHash: string | null;
  origin: DeliveryProviderOrigin;
  destination: DeliveryProviderDestination;
  packages: readonly DeliveryProviderPackage[];
  lastTrackingEvent: DeliveryTrackingEventSnapshot | null;
  lastFailure: DeliveryProviderFailure | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigureDeliveryProviderAccountParams {
  organizationId: string;
  storeId: string;
  installationId: string;
  mode: DeliveryProviderMode;
  idempotencyKey: string;
  correlationId: string;
}

export interface ConfigureDeliveryProviderAccountResult {
  providerAccountId: string;
  workflowId: string;
  duplicate: boolean;
}

export interface SetDeliveryProviderAccountStatusParams {
  storeId: string;
  providerAccountId: string;
  expectedAccountRevision: number;
  status: "ACTIVE" | "INACTIVE";
  idempotencyKey: string;
  correlationId: string;
}

export interface SetDeliveryProviderAccountStatusResult {
  account: DeliveryProviderAccountSnapshot;
}

export interface GetDeliveryProviderAccountParams {
  storeId: string;
  providerAccountId: string;
}

export interface GetDeliveryProviderAccountResult {
  account: DeliveryProviderAccountSnapshot;
}

export interface SearchDeliveryPickupLocationsParams {
  storeId: string;
  providerAccountId: string;
  request: DeliveryProviderLocationSearchRequest;
}

export interface SearchDeliveryPickupLocationsResult {
  route: DeliveryProviderRouteSnapshot;
  result: DeliveryProviderLocationSearchResult;
}

export interface ResolveDeliveryPickupLocationParams {
  storeId: string;
  providerAccountId: string;
  request: DeliveryProviderLocationResolveRequest;
}

export interface ResolveDeliveryPickupLocationResult {
  route: DeliveryProviderRouteSnapshot;
  result: DeliveryProviderLocationResolveResult;
}

export interface CreateDeliveryShipmentParams {
  storeId: string;
  fulfillmentId: string;
  expectedFulfillmentRevision: number;
  checkoutId: string;
  groupId: string;
  optionHandle: string;
  deliveryRevision: string;
  customerInput: PricingCheckoutJsonObject | null;
  effectiveAt: string;
  idempotencyKey: string;
  correlationId: string;
}

export interface DeliveryOperationAcceptedResult {
  shipmentId: string;
  operationId: string;
  workflowId: string;
  duplicate: boolean;
}

export interface CreateDeliveryShipmentResult
  extends DeliveryOperationAcceptedResult {}

export interface CancelDeliveryShipmentParams {
  storeId: string;
  shipmentId: string;
  expectedShipmentRevision: number;
  reason: string | null;
  idempotencyKey: string;
  correlationId: string;
}

export interface ReconcileDeliveryShipmentParams {
  storeId: string;
  shipmentId: string;
  expectedShipmentRevision: number;
  idempotencyKey: string;
  correlationId: string;
}

export interface GetDeliveryShipmentParams {
  storeId: string;
  shipmentId: string;
}

export interface GetDeliveryShipmentResult {
  shipment: DeliveryShipmentSnapshot;
  operations: readonly DeliveryShipmentOperationSnapshot[];
  trackingEvents: readonly DeliveryTrackingEventSnapshot[];
}

// ---------------------------------------------------------------------------
// Provider App protocol: shipment operations
// ---------------------------------------------------------------------------

export interface DeliveryProviderShipmentRequestBase {
  protocolVersion: typeof DELIVERY_PROVIDER_PROTOCOL_VERSION;
  operationId: string;
  shipmentId: string;
  providerAccountId: string;
  idempotencyKey: string;
  idempotencyRequestHash: string;
  correlationId: string;
  deadlineAt: string;
}

export interface DeliveryProviderCreateShipmentRequest
  extends DeliveryProviderShipmentRequestBase {
  operation: "CREATE";
  orderReference: string;
  fulfillmentReference: string;
  fulfillmentPlanHash: string;
  ratedFactsHash: string;
  providerServiceCode: string;
  providerQuoteToken: string;
  origin: DeliveryProviderOrigin;
  destination: DeliveryProviderDestination;
  sender: DeliveryProviderContact;
  recipient: DeliveryProviderContact;
  packages: readonly DeliveryProviderPackage[];
  customerInput: PricingCheckoutJsonObject | null;
  customerInputHash: string | null;
}

export interface DeliveryProviderCancelShipmentRequest
  extends DeliveryProviderShipmentRequestBase {
  operation: "CANCEL";
  providerShipmentReference: string;
  reason: string | null;
}

export interface DeliveryProviderGetShipmentRequest
  extends Omit<DeliveryProviderShipmentRequestBase, "idempotencyKey" | "idempotencyRequestHash"> {
  operation: "GET";
  providerShipmentReference: string;
}

export interface DeliveryProviderReconcileShipmentRequest
  extends DeliveryProviderShipmentRequestBase {
  operation: "RECONCILE";
  providerShipmentReference: string;
}

export type DeliveryProviderShipmentRequest =
  | DeliveryProviderCreateShipmentRequest
  | DeliveryProviderCancelShipmentRequest
  | DeliveryProviderGetShipmentRequest
  | DeliveryProviderReconcileShipmentRequest;

export type DeliveryProviderShipmentOperationResult<
  TOperation extends "CREATE" | "CANCEL" = "CREATE" | "CANCEL",
> =
  | Readonly<{
      operation: TOperation;
      status: "SUCCEEDED";
      providerShipmentReference: string;
      shipmentState: DeliveryShipmentState;
      parcels: readonly DeliveryParcelSnapshot[];
      events: readonly DeliveryTrackingEventSnapshot[];
      processedAt: string;
      metadata: PricingCheckoutJsonObject | null;
    }>
  | Readonly<{
      operation: TOperation;
      status: "PENDING";
      providerShipmentReference: string;
      shipmentState: DeliveryShipmentState;
      nextReconcileAt: string | null;
      observedAt: string;
      metadata: PricingCheckoutJsonObject | null;
    }>
  | Readonly<{
      operation: TOperation;
      status: "FAILED";
      providerShipmentReference: string | null;
      failure: DeliveryProviderFailure;
      failedAt: string;
      metadata: PricingCheckoutJsonObject | null;
    }>;

export interface DeliveryProviderReconcileShipmentResult {
  status: "RECONCILED";
  providerShipmentReference: string;
  shipmentState: DeliveryShipmentState;
  parcels: readonly DeliveryParcelSnapshot[];
  events: readonly DeliveryTrackingEventSnapshot[];
  observedAt: string;
  metadata: PricingCheckoutJsonObject | null;
}

export type DeliveryProviderExternalEvent =
  | Readonly<{
      type: "SHIPMENT_STATUS_CHANGED";
      providerShipmentReference: string;
      shipmentState: DeliveryShipmentState;
      parcel: DeliveryParcelSnapshot | null;
      event: DeliveryTrackingEventSnapshot;
      metadata: PricingCheckoutJsonObject | null;
    }>
  | Readonly<{
      type: "SHIPMENT_LABEL_AVAILABLE";
      providerShipmentReference: string;
      parcelId: string;
      providerParcelReference: string | null;
      label: DeliveryLabelSnapshot;
      metadata: PricingCheckoutJsonObject | null;
    }>;

/** Typed handler surface implemented by every delivery provider App. */
export interface DeliveryProviderAppContract {
  validateConfiguration(
    request: DeliveryProviderConfigurationValidationRequest,
  ): Promise<DeliveryProviderConfigurationValidationResult>;
  quoteRates(
    request: DeliveryProviderRateRequest,
  ): Promise<DeliveryProviderRateResult>;
  searchLocations?(
    request: DeliveryProviderLocationSearchRequest,
  ): Promise<DeliveryProviderLocationSearchResult>;
  resolveLocation?(
    request: DeliveryProviderLocationResolveRequest,
  ): Promise<DeliveryProviderLocationResolveResult>;
  createShipment(
    request: DeliveryProviderCreateShipmentRequest,
  ): Promise<DeliveryProviderShipmentOperationResult<"CREATE">>;
  cancelShipment?(
    request: DeliveryProviderCancelShipmentRequest,
  ): Promise<DeliveryProviderShipmentOperationResult<"CANCEL">>;
  getShipment?(
    request: DeliveryProviderGetShipmentRequest,
  ): Promise<DeliveryProviderReconcileShipmentResult>;
  reconcileShipment?(
    request: DeliveryProviderReconcileShipmentRequest,
  ): Promise<DeliveryProviderReconcileShipmentResult>;
}

export interface DeliveryProviderAppDefinition {
  capability: DeliveryProviderAppManifestCapability;
  handlers: DeliveryProviderAppContract;
}

interface CompleteDeliveryProviderOperationParamsBase {
  protocolVersion: typeof DELIVERY_PROVIDER_PROTOCOL_VERSION;
  shipmentId: string;
  operationId: string;
  providerEventId: string;
  occurredAt: string;
}

export type CompleteDeliveryProviderOperationParams =
  | Readonly<
      CompleteDeliveryProviderOperationParamsBase & {
        operationType: "CREATE";
        result: DeliveryProviderShipmentOperationResult<"CREATE">;
      }
    >
  | Readonly<
      CompleteDeliveryProviderOperationParamsBase & {
        operationType: "CANCEL";
        result: DeliveryProviderShipmentOperationResult<"CANCEL">;
      }
    >
  | Readonly<
      CompleteDeliveryProviderOperationParamsBase & {
        operationType: "GET" | "RECONCILE";
        result: DeliveryProviderReconcileShipmentResult;
      }
    >;

export interface CompleteDeliveryProviderOperationResult {
  accepted: true;
  duplicate: boolean;
  shipmentRevision: number;
}

export interface ReportDeliveryProviderEventParams {
  protocolVersion: typeof DELIVERY_PROVIDER_PROTOCOL_VERSION;
  providerAccountId: string;
  providerEventId: string;
  occurredAt: string;
  event: DeliveryProviderExternalEvent;
}

export interface ReportDeliveryProviderEventResult {
  accepted: true;
  duplicate: boolean;
  shipmentId: string;
  shipmentRevision: number;
}
