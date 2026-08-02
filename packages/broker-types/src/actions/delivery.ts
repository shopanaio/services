import type {
  CalculateCheckoutPreliminaryQuoteResult,
  PricingCheckoutJsonObject,
  PricingCheckoutMoney,
  PricingCheckoutStageProvenance,
} from "./pricing.js";
import type { DeliveryRateFallbackCategory } from "./delivery-configuration.js";
import type {
  DeliveryCommittedMethodSnapshot,
  DeliveryFulfillmentOrderLineItemInput,
} from "./delivery-fulfillment.js";

export type * from "./delivery-configuration.js";
export {
  DeliveryConfigurationActionNames,
  DeliveryConfigurationActions,
} from "./delivery-configuration.js";
export {
  DELIVERY_CUSTOMIZATION_MAX_EXECUTIONS,
  DELIVERY_CUSTOMIZATION_MAX_OPERATIONS,
  DELIVERY_CUSTOMIZATION_FUNCTION_TARGET,
} from "./delivery-customization.js";
export type * from "./delivery-customization.js";
export type * from "./delivery-fulfillment.js";

export const DeliveryCheckoutActionNames = {
  calculateOptions: "calculateCheckoutDeliveryOptions",
  searchOptionChoices: "searchDeliveryOptionChoices",
} as const;

export const DeliveryCheckoutActions = {
  calculateOptions:
    `delivery.${DeliveryCheckoutActionNames.calculateOptions}`,
  searchOptionChoices:
    `delivery.${DeliveryCheckoutActionNames.searchOptionChoices}`,
} as const;

export interface SearchDeliveryOptionChoicesParams {
  storeId: string;
  checkoutId: string;
  checkoutVersion: number;
  groupId: string;
  optionHandle: string;
  query: string;
  cursor: string | null;
  limit: number;
  correlationId: string;
  deadlineAt: string;
  effectiveAt: string;
}

export interface SearchDeliveryOptionChoicesResult {
  options: readonly Readonly<{
    value: PricingCheckoutJsonObject;
    label: string;
    publicData: PricingCheckoutJsonObject;
  }>[];
  nextCursor: string | null;
  revision: string;
}

/** Real-time checkout rate calculation, independent from fulfillment ownership. */
export const DELIVERY_CARRIER_SERVICE_CAPABILITY =
  "delivery.carrier-service" as const;

/** Post-order shipment execution, independent from checkout rate calculation. */
export const DELIVERY_SHIPMENT_PROVIDER_CAPABILITY =
  "delivery.shipment-provider" as const;

export type DeliveryProviderCapability =
  | typeof DELIVERY_CARRIER_SERVICE_CAPABILITY
  | typeof DELIVERY_SHIPMENT_PROVIDER_CAPABILITY;

/** Version of the platform-to-provider delivery protocol. */
export const DELIVERY_PROVIDER_PROTOCOL_VERSION = 2 as const;

/** Stable operation contracts declared by every delivery provider App. */
export const DeliveryProviderOperations = {
  validateCarrierServiceConfiguration: "validateCarrierServiceConfiguration",
  validateShipmentConfiguration: "validateShipmentConfiguration",
  quoteRates: "quoteRates",
  resolveCustomerInput: "resolveCustomerInput",
  searchCustomerInputOptions: "searchCustomerInputOptions",
  createShipment: "createShipment",
  cancelShipment: "cancelShipment",
  getShipment: "getShipment",
  reconcileShipment: "reconcileShipment",
} as const;

export type DeliveryProviderOperation =
  (typeof DeliveryProviderOperations)[keyof typeof DeliveryProviderOperations];

export type DeliveryCarrierServiceOperation =
  | "validateCarrierServiceConfiguration"
  | "quoteRates"
  | "resolveCustomerInput"
  | "searchCustomerInputOptions";

export type DeliveryShipmentProviderOperation =
  | "validateShipmentConfiguration"
  | "createShipment"
  | "cancelShipment"
  | "getShipment"
  | "reconcileShipment";

/** Manifest capability fragment declared by delivery provider Apps. */
export type DeliveryProviderAppManifestCapability =
  | Readonly<{
      key: typeof DELIVERY_CARRIER_SERVICE_CAPABILITY;
      assignmentMode: "store";
      routingMode: "broadcast";
      operations: Readonly<{
        validateCarrierServiceConfiguration: string;
        quoteRates: string;
        resolveCustomerInput: string;
        searchCustomerInputOptions?: string;
      }>;
    }>
  | Readonly<{
      key: typeof DELIVERY_SHIPMENT_PROVIDER_CAPABILITY;
      assignmentMode: "store";
      routingMode: "broadcast";
      operations: Readonly<{
        validateShipmentConfiguration: string;
        createShipment: string;
        cancelShipment?: string;
        getShipment?: string;
        reconcileShipment?: string;
      }>;
    }>;

/** Platform-owned delivery lifecycle actions. */
export const DeliveryActionNames = {
  configureProviderAccount: "configureDeliveryProviderAccount",
  setProviderCapabilityStatus: "setDeliveryProviderCapabilityStatus",
  getProviderAccount: "getDeliveryProviderAccount",
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
  setProviderCapabilityStatus:
    `delivery.${DeliveryActionNames.setProviderCapabilityStatus}`,
  getProviderAccount: `delivery.${DeliveryActionNames.getProviderAccount}`,
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
  targetCheckoutVersion: number;
  storeId: string;
  currencyCode: string;
  localeCode: string | null;
  channelCode: string;
  effectiveAt: string;
  buyerEligibility: Readonly<{
    customerId: string | null;
    countryCode: string | null;
    marketId: string | null;
    companyId: string | null;
    segmentIds: readonly string[];
    segmentMembershipRevision: string | null;
  }> | null;
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

export type DeliveryCheckoutMethodType =
  | "LOCAL"
  | "NONE"
  | "PICK_UP"
  | "PICKUP_POINT"
  | "RETAIL"
  | "SHIPPING";
export interface DeliveryCheckoutOptionBase {
  handle: string;
  profileId: string;
  methodDefinitionId: string;
  code: string;
  title: string;
  description: string | null;
  deliveryMethodType: DeliveryCheckoutMethodType;
  cost: PricingCheckoutMoney;
  estimatedMinDeliveryAt: string | null;
  estimatedMaxDeliveryAt: string | null;
  phoneRequired: boolean;
  customerInputContract: DeliveryCustomerInputContract | null;
  /** Storefront-safe metadata projected by Delivery Core. */
  publicData: PricingCheckoutJsonObject;
}

export type DeliveryCheckoutOption =
  | Readonly<
      DeliveryCheckoutOptionBase & {
        source: "MANUAL";
        carrier: null;
      }
    >
  | Readonly<
      DeliveryCheckoutOptionBase & {
        source: "CARRIER_SERVICE";
        carrier: Readonly<{
          code: string;
        }>;
      }
    >;

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

export interface DeliveryCheckoutCarrierServiceExecutionBase {
  groupId: string;
  carrierServiceAccountId: string;
  route: DeliveryProviderRouteSnapshot & Readonly<{ operation: "quoteRates" }>;
  executionPolicyRevision: string;
  rateCount: number;
  durationMs: number;
  attemptCount: number;
  rateSource:
    | "CARRIER_SERVICE_LIVE"
    | "CARRIER_SERVICE_CACHE"
    | "BACKUP_RATE";
  startedAt: string;
  completedAt: string;
}

export type DeliveryCheckoutCarrierServiceExecution =
  | Readonly<
      DeliveryCheckoutCarrierServiceExecutionBase & {
        status: "SUCCEEDED";
        failure: null;
      }
    >
  | Readonly<
      DeliveryCheckoutCarrierServiceExecutionBase & {
        status: "NO_SERVICE";
        failure:
          | (DeliveryProviderFailure & Readonly<{ category: "NO_SERVICE" }>)
          | null;
      }
    >
  | Readonly<
      DeliveryCheckoutCarrierServiceExecutionBase & {
        status: "FAILED";
        failure: DeliveryProviderFailure;
      }
    >
  | Readonly<
      DeliveryCheckoutCarrierServiceExecutionBase & {
        status: "TIMED_OUT";
        failure: DeliveryProviderFailure & Readonly<{ category: "TIMEOUT" }>;
      }
    >
  | Readonly<
      DeliveryCheckoutCarrierServiceExecutionBase & {
        status: "BACKUP_RATE_APPLIED";
        failure: DeliveryProviderFailure &
          Readonly<{ category: DeliveryRateFallbackCategory }>;
      }
    >;

export interface DeliveryCheckoutIssue {
  severity: "WARNING" | "ERROR";
  code: string;
  message: string;
  groupId: string | null;
  carrierServiceAccountId: string | null;
  retryable: boolean;
}

export interface CalculateCheckoutDeliveryOptionsParams {
  context: DeliveryCheckoutEvaluationContext;
  preliminary: CalculateCheckoutPreliminaryQuoteResult;
  destinations: readonly DeliveryCheckoutDestinationIntent[];
  selections: readonly DeliveryCheckoutOptionSelectionIntent[];
  cartAttributes: PricingCheckoutJsonObject;
}

export interface CalculateCheckoutDeliveryOptionsResult
  extends PricingCheckoutStageProvenance {
  revision: string;
  basedOnPreliminaryRevision: string;
  ratePlanRevision: string;
  eligibilityRevision: string;
  customizationRevision: string;
  customizationPolicyRevision: string;
  groups: readonly DeliveryCheckoutGroup[];
  orphanedSelectionResets: readonly DeliveryCheckoutOrphanedSelectionReset[];
  carrierServiceExecutions: readonly DeliveryCheckoutCarrierServiceExecution[];
  issues: readonly DeliveryCheckoutIssue[];
}

// ---------------------------------------------------------------------------
// Provider accounts, immutable routes and checkout bindings
// ---------------------------------------------------------------------------

export type DeliveryProviderCapabilityStatus =
  | "CONFIGURING"
  | "READY"
  | "ACTIVE"
  | "INACTIVE"
  | "DEGRADED"
  | "SUSPENDED";

export const DeliveryProviderCapabilityTransitions = {
  CONFIGURING: ["READY", "DEGRADED", "SUSPENDED"],
  READY: ["ACTIVE", "INACTIVE", "DEGRADED", "SUSPENDED"],
  ACTIVE: ["INACTIVE", "DEGRADED", "SUSPENDED"],
  INACTIVE: ["ACTIVE", "DEGRADED", "SUSPENDED"],
  DEGRADED: ["READY", "ACTIVE", "INACTIVE", "SUSPENDED"],
  SUSPENDED: ["CONFIGURING", "INACTIVE"],
} as const satisfies Readonly<
  Record<
    DeliveryProviderCapabilityStatus,
    readonly DeliveryProviderCapabilityStatus[]
  >
>;

export type DeliveryProviderMode = "TEST" | "LIVE";

export interface DeliveryCarrierServiceCapabilities {
  /** Mirrors Shopify DeliveryCarrierService.supportsServiceDiscovery. */
  supportsServiceDiscovery: boolean;
}

export interface DeliveryShipmentProviderCapabilities {
  supportsLabels: boolean;
  supportsMultipleParcels: boolean;
  supportsCancellation: boolean;
  supportsTracking: boolean;
  supportsReconciliation: boolean;
  supportsAsyncCompletion: boolean;
}

/** Delivery-owned link to an Apps installation. Secrets remain Apps-owned. */
export interface DeliveryProviderAccountSnapshotBase {
  providerAccountId: string;
  organizationId: string;
  storeId: string;
  installationId: string;
  appCode: string;
  appVersion: string;
  providerCode: string;
  displayName: string;
  mode: DeliveryProviderMode;
  supportedCountryCodes: readonly string[];
  supportedCurrencyCodes: readonly string[];
  supportedOperations: readonly DeliveryProviderOperation[];
  /** Platform-owned optimistic concurrency revision. */
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export type DeliveryProviderCapabilityState<TCapabilities> =
  | Readonly<{
      status: "READY" | "ACTIVE" | "INACTIVE";
      capabilities: TCapabilities;
      /** Provider-owned fingerprint; never used as entity CAS. */
      configurationRevision: string;
      statusReason: null;
    }>
  | Readonly<{
      status: "CONFIGURING";
      capabilities: TCapabilities | null;
      configurationRevision: string | null;
      statusReason: null;
    }>
  | Readonly<{
      status: "DEGRADED" | "SUSPENDED";
      capabilities: TCapabilities | null;
      configurationRevision: string | null;
      statusReason: Readonly<{ code: string; message: string }>;
    }>;

export type DeliveryProviderAccountSnapshot = Readonly<
  DeliveryProviderAccountSnapshotBase & {
    capabilityStates: Readonly<{
      carrierService:
        | DeliveryProviderCapabilityState<DeliveryCarrierServiceCapabilities>
        | null;
      shipmentProvider:
        | DeliveryProviderCapabilityState<DeliveryShipmentProviderCapabilities>
        | null;
    }>;
  }
>;

/** Immutable Apps route pinned to a quote or shipment operation. */
interface DeliveryProviderRouteSnapshotBase {
  protocolVersion: typeof DELIVERY_PROVIDER_PROTOCOL_VERSION;
  capabilityRouteId: string;
  installationId: string;
  appCode: string;
  appVersion: string;
  routeRevision: string;
}

export type DeliveryProviderRouteSnapshot =
  | Readonly<
      DeliveryProviderRouteSnapshotBase & {
        capability: typeof DELIVERY_CARRIER_SERVICE_CAPABILITY;
        operation: DeliveryCarrierServiceOperation;
      }
    >
  | Readonly<
      DeliveryProviderRouteSnapshotBase & {
        capability: typeof DELIVERY_SHIPMENT_PROVIDER_CAPABILITY;
        operation: DeliveryShipmentProviderOperation;
      }
    >;

export interface DeliveryOptionBindingSnapshotBase {
  optionHandle: string;
  checkoutId: string;
  basedOnCheckoutVersion: number;
  targetCheckoutVersion: number;
  groupId: string;
  profileId: string;
  methodDefinitionId: string;
  preliminaryRevision: string;
  ratePlanRevision: string;
  eligibilityRevision: string;
  customizationRevision: string;
  customizationPolicyRevision: string;
  /** Hash of origin, destination, packages, currency and checkout version. */
  ratedFactsHash: string;
  customerInputContract: DeliveryCustomerInputContract | null;
  expiresAt: string;
}

/** Exact provider binding hidden behind a checkout-facing option handle. */
export interface DeliveryCarrierServiceOptionBindingSnapshot
  extends DeliveryOptionBindingSnapshotBase {
  source: "CARRIER_SERVICE";
  carrierServiceAccountId: string;
  carrierCode: string;
  serviceCode: string;
  quoteRoute: DeliveryProviderRouteSnapshot &
    Readonly<{ operation: "quoteRates" }>;
  carrierServiceConfigurationRevision: string;
  executionPolicyRevision: string;
  customerInputSchemaPolicyRevision: string;
  publicDataPolicyRevision: string;
  quoteRevision: string;
}

/** Merchant-owned rate which does not imply a provider shipment integration. */
export interface DeliveryManualRateOptionBindingSnapshot
  extends DeliveryOptionBindingSnapshotBase {
  source: "MANUAL";
  manualRateRevision: number;
}

export type DeliveryOptionBindingSnapshot =
  | DeliveryCarrierServiceOptionBindingSnapshot
  | DeliveryManualRateOptionBindingSnapshot;

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
  /** Customs value of one unit; package declaredValue is the exact extended total. */
  unitDeclaredValue: DeliveryProviderMoney;
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

export interface DeliveryProviderCustomerInputContract {
  schemaDialect: "https://json-schema.org/draft/2020-12/schema";
  schema: PricingCheckoutJsonObject;
}

export interface DeliveryCustomerInputContract
  extends DeliveryProviderCustomerInputContract {
  /** Both fields are assigned by Delivery Core after policy validation. */
  schemaHash: string;
  schemaPolicyRevision: string;
}

// ---------------------------------------------------------------------------
// Provider App protocol: configuration and checkout rate discovery
// ---------------------------------------------------------------------------

export interface DeliveryProviderConfigurationValidationRequest<
  TCapability extends DeliveryProviderCapability = DeliveryProviderCapability,
> {
  protocolVersion: typeof DELIVERY_PROVIDER_PROTOCOL_VERSION;
  capability: TCapability;
  correlationId: string;
  deadlineAt: string;
  mode: DeliveryProviderMode;
}

export interface DeliveryProviderConfigurationValidationResultBase<
  TCapability extends DeliveryProviderCapability = DeliveryProviderCapability,
> {
  capability: TCapability;
  providerCode: string;
  displayName: string;
  supportedCountryCodes: readonly string[];
  supportedCurrencyCodes: readonly string[];
  supportedOperations: readonly (TCapability extends "delivery.carrier-service"
    ? DeliveryCarrierServiceOperation
    : DeliveryShipmentProviderOperation)[];
  capabilities: TCapability extends "delivery.carrier-service"
    ? DeliveryCarrierServiceCapabilities
    : DeliveryShipmentProviderCapabilities;
  configurationRevision: string;
}

export type DeliveryProviderConfigurationValidationResult<
  TCapability extends DeliveryProviderCapability = DeliveryProviderCapability,
> = TCapability extends DeliveryProviderCapability
  ? Readonly<
      DeliveryProviderConfigurationValidationResultBase<TCapability> & {
        status: "READY";
        failure: null;
      }
    >
  | Readonly<
      DeliveryProviderConfigurationValidationResultBase<TCapability> & {
        status: "DEGRADED" | "INVALID";
        failure: DeliveryProviderFailure;
      }
    >
  : never;

export interface DeliveryCarrierServiceRateRequest {
  protocolVersion: typeof DELIVERY_PROVIDER_PROTOCOL_VERSION;
  quoteRequestId: string;
  executionId: string;
  correlationId: string;
  deadlineAt: string;
  effectiveAt: string;
  storeId: string;
  checkoutId: string;
  basedOnCheckoutVersion: number;
  targetCheckoutVersion: number;
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
  packages: readonly [DeliveryProviderPackage, ...DeliveryProviderPackage[]];
}

export interface DeliveryCarrierServiceRate {
  /** Stable provider-local service identifier. */
  serviceCode: string;
  serviceName: string;
  description: string;
  cost: DeliveryProviderMoney;
  estimatedMinDeliveryAt: string | null;
  estimatedMaxDeliveryAt: string | null;
  phoneRequired: boolean;
  customerInputContract: DeliveryProviderCustomerInputContract | null;
  publicData: PricingCheckoutJsonObject;
}

export interface DeliveryProviderResolveCustomerInputRequest {
  protocolVersion: typeof DELIVERY_PROVIDER_PROTOCOL_VERSION;
  correlationId: string;
  deadlineAt: string;
  effectiveAt: string;
  storeId: string;
  providerAccountId: string;
  serviceCode: string;
  customerInputContractHash: string;
  value: PricingCheckoutJsonObject | null;
}

export type DeliveryProviderResolveCustomerInputResult =
  | Readonly<{
      status: "VALID";
      normalized: PricingCheckoutJsonObject | null;
      valueHash: string;
      semanticRevision: string;
      publicData: PricingCheckoutJsonObject;
    }>
  | Readonly<{
      status: "INVALID";
      issues: readonly Readonly<{
        path: string;
        code: string;
        message: string;
      }>[];
    }>;

export interface DeliveryProviderSearchCustomerInputOptionsRequest {
  protocolVersion: typeof DELIVERY_PROVIDER_PROTOCOL_VERSION;
  correlationId: string;
  deadlineAt: string;
  effectiveAt: string;
  storeId: string;
  providerAccountId: string;
  serviceCode: string;
  customerInputContractHash: string;
  query: string;
  cursor: string | null;
  limit: number;
}

export interface DeliveryProviderSearchCustomerInputOptionsResult {
  options: readonly Readonly<{
    value: PricingCheckoutJsonObject;
    label: string;
    publicData: PricingCheckoutJsonObject;
  }>[];
  nextCursor: string | null;
  revision: string;
}

export interface DeliveryCarrierServiceRateResult {
  quoteRequestId: string;
  revision: string;
  /** Empty is the Shopify-compatible no-service response. */
  rates: readonly DeliveryCarrierServiceRate[];
  warnings: readonly Readonly<{ code: string; message: string }>[];
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

/** Provider-observable states exclude platform-owned command and failure states. */
export type DeliveryProviderObservedShipmentState =
  | "PENDING"
  | "ACCEPTED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "DELIVERY_FAILED"
  | "RETURNING"
  | "RETURNED"
  | "CANCELLED";

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
  mediaId: string;
  assetPolicyRevision: string;
  expiresAt: string | null;
}

export interface DeliveryTrackingEventSnapshot {
  providerEventId: string;
  providerShipmentSequence: string | null;
  parcelId: string | null;
  providerParcelReference: string | null;
  statusCode: string;
  state: DeliveryProviderObservedShipmentState;
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

/** Untrusted label reference returned by a provider; mediaId is assigned by Delivery Core. */
export interface DeliveryProviderLabel {
  format: "PDF" | "PNG" | "ZPL";
  downloadUrl: string;
  expiresAt: string | null;
}

export interface DeliveryProviderTrackingEvent {
  providerEventId: string;
  /** Optional shipment-global monotonic sequence encoded as an unsigned decimal string. */
  providerShipmentSequence: string | null;
  providerParcelReference: string | null;
  statusCode: string;
  state: DeliveryProviderObservedShipmentState;
  message: string | null;
  location: DeliveryProviderLocationAddress | null;
  occurredAt: string;
}

/** Provider-owned parcel observation normalized into a platform snapshot by Delivery Core. */
export interface DeliveryProviderParcelObservation {
  providerParcelReference: string;
  packageIds: readonly [string, ...string[]];
  state: DeliveryProviderObservedShipmentState;
  tracking: readonly DeliveryTrackingSnapshot[];
  labels: readonly DeliveryProviderLabel[];
  estimatedDeliveryAt: string | null;
  deliveredAt: string | null;
}

export interface DeliveryShipmentOperationSnapshot {
  operationId: string;
  shipmentId: string;
  type: DeliveryShipmentOperationType;
  state: DeliveryShipmentOperationState;
  idempotency: DeliveryIdempotencySnapshot;
  route: Extract<
    DeliveryProviderRouteSnapshot,
    Readonly<{ capability: "delivery.shipment-provider" }>
  >;
  configurationRevision: string;
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
  fulfillmentOrderId: string;
  fulfillmentOrderRevision: number;
  shipmentPlanHash: string;
  checkoutId: string;
  deliveryGroupId: string;
  ratedFactsHash: string;
  state: DeliveryShipmentState;
  providerAccountId: string;
  providerCode: string;
  providerShipmentReference: string | null;
  parcels: readonly DeliveryParcelSnapshot[];
  selectedDeliveryMethod: DeliveryCommittedMethodSnapshot;
  origin: DeliveryProviderOrigin;
  destination: DeliveryProviderDestination;
  packages: readonly [DeliveryProviderPackage, ...DeliveryProviderPackage[]];
  lastTrackingEvent: DeliveryTrackingEventSnapshot | null;
  lastProviderShipmentSequence: string | null;
  lastFailure: DeliveryProviderFailure | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigureDeliveryProviderAccountParams {
  organizationId: string;
  storeId: string;
  installationId: string;
  enabledCapabilities:
    | readonly [typeof DELIVERY_CARRIER_SERVICE_CAPABILITY]
    | readonly [typeof DELIVERY_SHIPMENT_PROVIDER_CAPABILITY]
    | readonly [
        typeof DELIVERY_CARRIER_SERVICE_CAPABILITY,
        typeof DELIVERY_SHIPMENT_PROVIDER_CAPABILITY,
      ]
    | readonly [
        typeof DELIVERY_SHIPMENT_PROVIDER_CAPABILITY,
        typeof DELIVERY_CARRIER_SERVICE_CAPABILITY,
      ];
  mode: DeliveryProviderMode;
  idempotencyKey: string;
  correlationId: string;
}

export interface ConfigureDeliveryProviderAccountResult {
  providerAccountId: string;
  workflowId: string;
  duplicate: boolean;
}

export interface SetDeliveryProviderCapabilityStatusParams {
  storeId: string;
  providerAccountId: string;
  expectedAccountRevision: number;
  capability:
    | typeof DELIVERY_CARRIER_SERVICE_CAPABILITY
    | typeof DELIVERY_SHIPMENT_PROVIDER_CAPABILITY;
  status: "ACTIVE" | "INACTIVE";
  idempotencyKey: string;
  correlationId: string;
}

export interface SetDeliveryProviderCapabilityStatusResult {
  account: DeliveryProviderAccountSnapshot;
}

export interface GetDeliveryProviderAccountParams {
  storeId: string;
  providerAccountId: string;
}

export interface GetDeliveryProviderAccountResult {
  account: DeliveryProviderAccountSnapshot;
}

export interface CreateDeliveryShipmentParams {
  storeId: string;
  fulfillmentOrderId: string;
  expectedFulfillmentOrderRevision: number;
  /** Null means every currently remaining physical line; a subset creates a partial shipment. */
  lineItems:
    | readonly [
        DeliveryFulfillmentOrderLineItemInput,
        ...DeliveryFulfillmentOrderLineItemInput[],
      ]
    | null;
  idempotencyKey: string;
  correlationId: string;
}

export interface DeliveryOperationAcceptedResult {
  status: "ACCEPTED";
  shipmentId: string;
  operationId: string;
  workflowId: string;
  duplicate: boolean;
}

export type CreateDeliveryShipmentResult =
  | DeliveryOperationAcceptedResult
  | Readonly<{
      status: "SHIPMENT_PROVIDER_NOT_CONFIGURED";
      fulfillmentOrderId: string;
      workflowId: string;
      duplicate: boolean;
    }>;

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
  fulfillmentOrderReference: string;
  shipmentConfigurationRevision: string;
  shipmentPlanHash: string;
  deliveryMethodCommitmentId: string;
  ratedFactsHash: string;
  deliveryMethodCode: string;
  selectedRate:
    | Readonly<{
        source: "MANUAL";
        serviceCode: string;
      }>
    | Readonly<{
        source: "CARRIER_SERVICE";
        carrierCode: string;
        serviceCode: string;
      }>;
  origin: DeliveryProviderOrigin;
  destination: DeliveryProviderDestination;
  sender: DeliveryProviderContact;
  recipient: DeliveryProviderContact;
  packages: readonly [DeliveryProviderPackage, ...DeliveryProviderPackage[]];
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

export type DeliveryProviderCreateShipmentOperationResult =
  | Readonly<{
      operation: "CREATE";
      status: "SUCCEEDED";
      providerShipmentReference: string;
      shipmentState:
        | "PENDING"
        | "ACCEPTED"
        | "IN_TRANSIT"
        | "OUT_FOR_DELIVERY"
        | "DELIVERED"
        | "DELIVERY_FAILED"
        | "RETURNING"
        | "RETURNED"
        | "CANCELLED";
      parcels: readonly [
        DeliveryProviderParcelObservation,
        ...DeliveryProviderParcelObservation[],
      ];
      events: readonly DeliveryProviderTrackingEvent[];
      processedAt: string;
      metadata: PricingCheckoutJsonObject | null;
    }>
  | Readonly<{
      operation: "CREATE";
      status: "PENDING";
      providerShipmentReference: string;
      shipmentState: "PENDING";
      nextReconcileAt: string | null;
      observedAt: string;
      metadata: PricingCheckoutJsonObject | null;
    }>
  | Readonly<{
      operation: "CREATE";
      status: "FAILED";
      providerShipmentReference: string | null;
      failure: DeliveryProviderFailure;
      failedAt: string;
      metadata: PricingCheckoutJsonObject | null;
    }>;

export type DeliveryProviderCancelShipmentOperationResult =
  | Readonly<{
      operation: "CANCEL";
      status: "SUCCEEDED";
      providerShipmentReference: string;
      shipmentState: "CANCELLED";
      parcels: readonly DeliveryProviderParcelObservation[];
      events: readonly DeliveryProviderTrackingEvent[];
      processedAt: string;
      metadata: PricingCheckoutJsonObject | null;
    }>
  | Readonly<{
      operation: "CANCEL";
      status: "PENDING";
      providerShipmentReference: string;
      shipmentState: "CANCELLING";
      nextReconcileAt: string | null;
      observedAt: string;
      metadata: PricingCheckoutJsonObject | null;
    }>
  | Readonly<{
      operation: "CANCEL";
      status: "FAILED";
      providerShipmentReference: string;
      failure: DeliveryProviderFailure;
      failedAt: string;
      metadata: PricingCheckoutJsonObject | null;
    }>;

export type DeliveryProviderShipmentOperationResult<
  TOperation extends "CREATE" | "CANCEL" = "CREATE" | "CANCEL",
> = TOperation extends "CREATE"
  ? DeliveryProviderCreateShipmentOperationResult
  : DeliveryProviderCancelShipmentOperationResult;

export interface DeliveryProviderReconcileShipmentResult {
  status: "RECONCILED";
  providerShipmentReference: string;
  shipmentState: DeliveryProviderObservedShipmentState;
  parcels: readonly DeliveryProviderParcelObservation[];
  events: readonly DeliveryProviderTrackingEvent[];
  observedAt: string;
  metadata: PricingCheckoutJsonObject | null;
}

export type DeliveryProviderExternalEvent =
  | Readonly<{
      type: "SHIPMENT_STATUS_CHANGED";
      providerShipmentReference: string;
      shipmentState: DeliveryProviderObservedShipmentState;
      parcel: DeliveryProviderParcelObservation | null;
      event: DeliveryProviderTrackingEvent;
      metadata: PricingCheckoutJsonObject | null;
    }>
  | Readonly<{
      type: "SHIPMENT_LABEL_AVAILABLE";
      providerShipmentReference: string;
      providerParcelReference: string;
      label: DeliveryProviderLabel;
      metadata: PricingCheckoutJsonObject | null;
    }>;

export interface DeliveryCarrierServiceAppContract {
  validateCarrierServiceConfiguration(
    request: DeliveryProviderConfigurationValidationRequest<
      "delivery.carrier-service"
    >,
  ): Promise<
    DeliveryProviderConfigurationValidationResult<"delivery.carrier-service">
  >;
  quoteRates(
    request: DeliveryCarrierServiceRateRequest,
  ): Promise<DeliveryCarrierServiceRateResult>;
  resolveCustomerInput(
    request: DeliveryProviderResolveCustomerInputRequest,
  ): Promise<DeliveryProviderResolveCustomerInputResult>;
  searchCustomerInputOptions?(
    request: DeliveryProviderSearchCustomerInputOptionsRequest,
  ): Promise<DeliveryProviderSearchCustomerInputOptionsResult>;
}

export interface DeliveryShipmentProviderAppContract {
  validateShipmentConfiguration(
    request: DeliveryProviderConfigurationValidationRequest<
      "delivery.shipment-provider"
    >,
  ): Promise<
    DeliveryProviderConfigurationValidationResult<"delivery.shipment-provider">
  >;
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

type DeliveryCarrierServiceManifestCapability = Extract<
  DeliveryProviderAppManifestCapability,
  Readonly<{ key: "delivery.carrier-service" }>
>;

type DeliveryShipmentProviderManifestCapability = Extract<
  DeliveryProviderAppManifestCapability,
  Readonly<{ key: "delivery.shipment-provider" }>
>;

export type DeliveryProviderAppDefinition =
  | Readonly<{
      capabilities: readonly [DeliveryCarrierServiceManifestCapability];
      handlers: DeliveryCarrierServiceAppContract;
    }>
  | Readonly<{
      capabilities: readonly [DeliveryShipmentProviderManifestCapability];
      handlers: DeliveryShipmentProviderAppContract;
    }>
  | Readonly<{
      capabilities:
        | readonly [
            DeliveryCarrierServiceManifestCapability,
            DeliveryShipmentProviderManifestCapability,
          ]
        | readonly [
            DeliveryShipmentProviderManifestCapability,
            DeliveryCarrierServiceManifestCapability,
          ];
      handlers: DeliveryCarrierServiceAppContract &
        DeliveryShipmentProviderAppContract;
    }>;

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
  providerEventId: string;
  providerShipmentSequence: string | null;
  occurredAt: string;
  event: DeliveryProviderExternalEvent;
}

export interface ReportDeliveryProviderEventResult {
  accepted: true;
  duplicate: boolean;
  shipmentId: string;
  shipmentRevision: number;
}
