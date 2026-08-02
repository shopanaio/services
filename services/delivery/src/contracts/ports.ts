import type {
  Apps,
  Delivery,
  DeliveryEvents,
  Pricing,
} from "@shopana/broker-types";
import type { DeliveryProviderCompletionContext } from "./actions.js";

/** Apps routing and invocation boundary used by Delivery Core. */
export interface DeliveryProviderAppsPort {
  listRoutes(
    params: Apps.ListDeliveryProviderRoutesParams,
  ): Promise<readonly Delivery.DeliveryProviderRouteSnapshot[]>;
  resolveRoute<T extends Apps.ListDeliveryProviderRoutesParams>(
    input: T & Readonly<{ installationId: string }>,
  ): Promise<
    | (Delivery.DeliveryProviderRouteSnapshot &
        Readonly<Pick<T, "capability" | "operation">>)
    | null
  >;
  resolvePinnedRoute(input: Readonly<{
    storeId: string;
    pinned: Delivery.DeliveryProviderRouteSnapshot;
    /** Long-lived shipments may move only within the same protocol version. */
    allowCompatibleAppUpgrade: boolean;
  }>): Promise<
    | Readonly<{
        status: "EXACT";
        route: Delivery.DeliveryProviderRouteSnapshot;
      }>
    | Readonly<{
        status: "COMPATIBLE_UPGRADE";
        route: Delivery.DeliveryProviderRouteSnapshot;
        previous: Delivery.DeliveryProviderRouteSnapshot;
      }>
    | Readonly<{
        status: "UNAVAILABLE";
        code: "APP_UNINSTALLED" | "ROUTE_REMOVED" | "PROTOCOL_INCOMPATIBLE";
      }>
  >;
  validateCarrierServiceConfiguration(
    route: Delivery.DeliveryProviderRouteSnapshot &
      Readonly<{
        capability: "delivery.carrier-service";
        operation: "validateCarrierServiceConfiguration";
      }>,
    request: Delivery.DeliveryProviderConfigurationValidationRequest<
      "delivery.carrier-service"
    >,
  ): Promise<
    Delivery.DeliveryProviderConfigurationValidationResult<"delivery.carrier-service">
  >;
  validateShipmentConfiguration(
    route: Delivery.DeliveryProviderRouteSnapshot &
      Readonly<{
        capability: "delivery.shipment-provider";
        operation: "validateShipmentConfiguration";
      }>,
    request: Delivery.DeliveryProviderConfigurationValidationRequest<
      "delivery.shipment-provider"
    >,
  ): Promise<
    Delivery.DeliveryProviderConfigurationValidationResult<"delivery.shipment-provider">
  >;
  quoteRates(
    route: Delivery.DeliveryProviderRouteSnapshot &
      Readonly<{
        capability: "delivery.carrier-service";
        operation: "quoteRates";
      }>,
    request: Delivery.DeliveryCarrierServiceRateRequest,
  ): Promise<Delivery.DeliveryCarrierServiceRateResult>;
  resolveCustomerInput(
    route: Delivery.DeliveryProviderRouteSnapshot &
      Readonly<{
        capability: "delivery.carrier-service";
        operation: "resolveCustomerInput";
      }>,
    request: Delivery.DeliveryProviderResolveCustomerInputRequest,
  ): Promise<Delivery.DeliveryProviderResolveCustomerInputResult>;
  searchCustomerInputOptions(
    route: Delivery.DeliveryProviderRouteSnapshot &
      Readonly<{
        capability: "delivery.carrier-service";
        operation: "searchCustomerInputOptions";
      }>,
    request: Delivery.DeliveryProviderSearchCustomerInputOptionsRequest,
  ): Promise<Delivery.DeliveryProviderSearchCustomerInputOptionsResult>;
  createShipment(
    route: Delivery.DeliveryProviderRouteSnapshot &
      Readonly<{
        capability: "delivery.shipment-provider";
        operation: "createShipment";
      }>,
    request: Delivery.DeliveryProviderCreateShipmentRequest,
  ): Promise<Delivery.DeliveryProviderShipmentOperationResult<"CREATE">>;
  cancelShipment(
    route: Delivery.DeliveryProviderRouteSnapshot &
      Readonly<{
        capability: "delivery.shipment-provider";
        operation: "cancelShipment";
      }>,
    request: Delivery.DeliveryProviderCancelShipmentRequest,
  ): Promise<Delivery.DeliveryProviderShipmentOperationResult<"CANCEL">>;
  getShipment(
    route: Delivery.DeliveryProviderRouteSnapshot &
      Readonly<{
        capability: "delivery.shipment-provider";
        operation: "getShipment";
      }>,
    request: Delivery.DeliveryProviderGetShipmentRequest,
  ): Promise<Delivery.DeliveryProviderReconcileShipmentResult>;
  reconcileShipment(
    route: Delivery.DeliveryProviderRouteSnapshot &
      Readonly<{
        capability: "delivery.shipment-provider";
        operation: "reconcileShipment";
      }>,
    request: Delivery.DeliveryProviderReconcileShipmentRequest,
  ): Promise<Delivery.DeliveryProviderReconcileShipmentResult>;
}

/** Policy for SSRF-safe, bounded ingestion of provider-owned label assets. */
export interface DeliveryProviderAssetPolicySnapshot {
  revision: string;
  allowedHosts: readonly string[];
  allowedContentTypes: readonly (
    | "application/pdf"
    | "image/png"
    | "application/zpl"
  )[];
  allowedPorts: readonly number[];
  /** Redirects are disabled so every fetched authority is policy-checked once. */
  maxRedirects: 0;
  networkPolicy: "PUBLIC_IPS_ONLY_DNS_PINNED";
  maxBytes: number;
  fetchTimeoutMs: number;
}

export interface DeliveryProviderAssetPolicyPort {
  resolve(
    route: Extract<
      Delivery.DeliveryProviderRouteSnapshot,
      Readonly<{ capability: "delivery.shipment-provider" }>
    >,
  ): Promise<DeliveryProviderAssetPolicySnapshot>;
}

/** The only boundary allowed to fetch provider assets and assign platform media IDs. */
export interface DeliveryProviderAssetsPort {
  ingestLabel(input: Readonly<{
    policy: DeliveryProviderAssetPolicySnapshot;
    route: Extract<
      Delivery.DeliveryProviderRouteSnapshot,
      Readonly<{ capability: "delivery.shipment-provider" }>
    >;
    providerAccountId: string;
    shipmentId: string;
    providerParcelReference: string;
    label: Delivery.DeliveryProviderLabel;
  }>): Promise<
    | Readonly<{
        status: "INGESTED";
        label: Delivery.DeliveryLabelSnapshot;
      }>
    | Readonly<{
        status: "REJECTED";
        code: string;
        message: string;
        retryable: boolean;
      }>
  >;
}

/** Maps untrusted provider references onto platform-owned parcel, event, and media IDs. */
export interface DeliveryProviderObservationNormalizerPort {
  normalize(input: Readonly<{
    current: Delivery.DeliveryShipmentSnapshot;
    route: Extract<
      Delivery.DeliveryProviderRouteSnapshot,
      Readonly<{ capability: "delivery.shipment-provider" }>
    >;
    parcels: readonly Delivery.DeliveryProviderParcelObservation[];
    events: readonly Delivery.DeliveryProviderTrackingEvent[];
    observedAt: string;
  }>): Promise<
    | Readonly<{
        status: "NORMALIZED";
        parcels: readonly Delivery.DeliveryParcelSnapshot[];
        events: readonly Delivery.DeliveryTrackingEventSnapshot[];
      }>
    | Readonly<{
        status: "REJECTED";
        code: string;
        message: string;
        retryable: boolean;
      }>
  >;
}

export interface DeliveryProviderPublicDataPolicySnapshot {
  revision: string;
  allowedTopLevelKeys: readonly string[];
  maxBytes: number;
}

/** Projects untrusted provider metadata into the only Storefront-safe representation. */
export interface DeliveryProviderPublicDataPort {
  resolvePolicy(input: Readonly<{
    storeId: string;
    providerAccountId: string;
  }>): Promise<DeliveryProviderPublicDataPolicySnapshot>;
  project(input: Readonly<{
    policy: DeliveryProviderPublicDataPolicySnapshot;
    providerAccountId: string;
    data: Pricing.PricingCheckoutJsonObject;
  }>):
    | Readonly<{
        accepted: true;
        publicData: Pricing.PricingCheckoutJsonObject;
      }>
    | Readonly<{
        accepted: false;
        code: string;
        message: string;
      }>;
}

export interface DeliveryProviderAccountsPort {
  listActiveForStore(
    storeId: string,
    capability: "delivery.carrier-service" | "delivery.shipment-provider",
  ): Promise<readonly Delivery.DeliveryProviderAccountSnapshot[]>;
  getById(
    storeId: string,
    providerAccountId: string,
  ): Promise<Delivery.DeliveryProviderAccountSnapshot | null>;
  getByInstallation(
    storeId: string,
    installationId: string,
  ): Promise<Delivery.DeliveryProviderAccountSnapshot | null>;
  save(
    account: Delivery.DeliveryProviderAccountSnapshot,
    expectedAccountRevision: number | null,
  ): Promise<
    | Readonly<{
        status: "SAVED";
        account: Delivery.DeliveryProviderAccountSnapshot;
      }>
    | Readonly<{
        status: "REVISION_CONFLICT";
        current: Delivery.DeliveryProviderAccountSnapshot;
      }>
  >;
}

export interface DeliveryProviderAccountTransitionPolicyPort {
  evaluate(input: Readonly<{
    current: Delivery.DeliveryProviderAccountSnapshot;
    capability: "delivery.carrier-service" | "delivery.shipment-provider";
    target: Delivery.DeliveryProviderCapabilityStatus;
  }>):
    | Readonly<{ allowed: true }>
    | Readonly<{ allowed: false; code: string; message: string }>;
}

export type DeliveryOptionBindingCandidate =
  | Readonly<{
      option: Extract<
        Delivery.DeliveryCheckoutOption,
        Readonly<{ source: "CARRIER_SERVICE" }>
      >;
      binding: Delivery.DeliveryCarrierServiceOptionBindingSnapshot;
    }>
  | Readonly<{
      option: Extract<
        Delivery.DeliveryCheckoutOption,
        Readonly<{ source: "MANUAL" }>
      >;
      binding: Delivery.DeliveryManualRateOptionBindingSnapshot;
    }>;

export type DeliveryOptionBindingResolution =
  | Readonly<{
      status: "FOUND";
      binding: Delivery.DeliveryOptionBindingSnapshot;
    }>
  | Readonly<{
      status: "NOT_FOUND" | "EXPIRED" | "DELIVERY_REVISION_MISMATCH";
    }>;

export type DeliveryCommittedSelectionResolution =
  | Readonly<{
      status: "COMMITTED";
      deliveryMethod: Delivery.DeliveryCommittedMethodSnapshot;
      duplicate: boolean;
    }>
  | Readonly<{
      status:
        | "NOT_FOUND"
        | "EXPIRED"
        | "CHECKOUT_VERSION_MISMATCH"
        | "DELIVERY_REVISION_MISMATCH"
        | "CUSTOMER_INPUT_INVALID";
      code: string;
      message: string;
    }>;

export interface DeliveryCustomerInputSchemaPolicySnapshot {
  revision: string;
  maxSchemaBytes: number;
  maxInputBytes: number;
  maxReferenceDepth: number;
  maxEvaluationSteps: number;
  /** Regex-bearing JSON Schema keywords are forbidden at the provider boundary. */
  allowRegexKeywords: false;
}

export interface DeliveryCustomerInputSchemaPolicyPort {
  resolve(input: Readonly<{
    storeId: string;
    providerAccountId: string;
  }>): Promise<DeliveryCustomerInputSchemaPolicySnapshot>;
}

/** Draft 2020-12 validation and canonicalization boundary for shopper input. */
export interface DeliveryCustomerInputValidationPort {
  normalizeContract(input: Readonly<{
    policy: DeliveryCustomerInputSchemaPolicySnapshot;
    contract: Delivery.DeliveryProviderCustomerInputContract;
  }>):
    | Readonly<{
        valid: true;
        contract: Delivery.DeliveryCustomerInputContract;
        /** Platform-computed canonical schema hash; provider hashes are never trusted. */
        schemaHash: string;
      }>
    | Readonly<{
        valid: false;
        issues: readonly Readonly<{
          path: string;
          code: string;
          message: string;
        }>[];
      }>;
  validate(input: Readonly<{
    policy: DeliveryCustomerInputSchemaPolicySnapshot;
    contract: Delivery.DeliveryCustomerInputContract | null;
    value: Pricing.PricingCheckoutJsonObject | null;
  }>):
    | Readonly<{
        valid: true;
        normalized: Pricing.PricingCheckoutJsonObject | null;
        valueHash: string;
      }>
    | Readonly<{
        valid: false;
        issues: readonly Readonly<{
          path: string;
          code: string;
          message: string;
        }>[];
      }>;
}

/** Provider-backed semantic resolution for tokens such as pickup locations. */
export interface DeliveryCustomerInputResolutionPort {
  resolve(input: Readonly<{
    binding: Delivery.DeliveryOptionBindingSnapshot;
    value: Pricing.PricingCheckoutJsonObject | null;
    effectiveAt: string;
  }>): Promise<
    | Readonly<{
        valid: true;
        normalized: Pricing.PricingCheckoutJsonObject | null;
        valueHash: string;
        semanticRevision: string;
      }>
    | Readonly<{
        valid: false;
        issues: readonly Readonly<{
          path: string;
          code: string;
          message: string;
        }>[];
      }>
  >;
}

/** Persistence boundary for expiring checkout quote handles. */
export interface DeliveryOptionBindingsPort {
  stageCheckoutSnapshot(input: Readonly<{
    storeId: string;
    checkoutId: string;
    basedOnCheckoutVersion: number;
    targetCheckoutVersion: number;
    preliminaryRevision: string;
    deliveryRevision: string;
    options: readonly DeliveryOptionBindingCandidate[];
    /** Storage retention boundary; each binding still enforces its own expiresAt. */
    retainUntil: string;
  }>): Promise<
    | Readonly<{ status: "STAGED" }>
    | Readonly<{
        status: "STALE_CHECKOUT_VERSION";
        currentCheckoutVersion: number;
      }>
    | Readonly<{
        status: "REVISION_CONFLICT";
        currentDeliveryRevision: string;
      }>
  >;
  resolve(input: Readonly<{
    storeId: string;
    checkoutId: string;
    checkoutVersion: number;
    groupId: string;
    optionHandle: string;
    effectiveAt: string;
  }>): Promise<DeliveryOptionBindingResolution>;

  /**
   * Resolves and validates an expiring checkout option exactly once at checkout
   * completion, then returns the immutable Orders-owned delivery method snapshot.
   */
  commitSelection(input: Readonly<{
    storeId: string;
    checkoutId: string;
    checkoutVersion: number;
    groupId: string;
    optionHandle: string;
    deliveryRevision: string;
    customerInput: Pricing.PricingCheckoutJsonObject | null;
    effectiveAt: string;
    idempotencyKey: string;
  }>): Promise<DeliveryCommittedSelectionResolution>;
}

export interface DeliveryIdempotencyPort {
  createSnapshot(input: Readonly<{
    scope: string;
    key: string;
    normalizedRequest: unknown;
  }>): Delivery.DeliveryIdempotencySnapshot;
}

/** Owns legal transitions and stale/out-of-order provider observation policy. */
export interface DeliveryShipmentTransitionPolicyPort {
  evaluate(input: Readonly<{
    current: Delivery.DeliveryShipmentSnapshot;
    observedState: Delivery.DeliveryProviderObservedShipmentState;
    occurredAt: string;
    providerEventId: string;
    providerShipmentSequence: string | null;
  }>):
    | Readonly<{ status: "APPLY"; nextState: Delivery.DeliveryShipmentState }>
    | Readonly<{ status: "IGNORE_STALE"; currentState: Delivery.DeliveryShipmentState }>
    | Readonly<{
        status: "REJECT_INVALID";
        currentState: Delivery.DeliveryShipmentState;
        code: string;
      }>;
}

export interface DeliveryProviderInboxRecord {
  storeId: string;
  providerAccountId: string;
  providerEventId: string;
  providerShipmentSequence: string | null;
  eventHash: string;
  occurredAt: string;
}

export interface DeliveryAtomicMutationRecord {
  mutationId: string;
  cause:
    | "COMMAND"
    | "PROVIDER_COMPLETION"
    | "PROVIDER_EVENT"
    | "RECONCILIATION";
  storeId: string;
  expectedShipmentRevision: number | null;
  idempotency: Delivery.DeliveryIdempotencySnapshot;
  shipment: Delivery.DeliveryShipmentSnapshot;
  operation: Delivery.DeliveryShipmentOperationSnapshot | null;
  trackingEvents: readonly Delivery.DeliveryTrackingEventSnapshot[];
  providerInbox: DeliveryProviderInboxRecord | null;
  domainEvents: readonly DeliveryDomainEvent[];
}

export type DeliveryAtomicMutationResult =
  | Readonly<{ status: "APPLIED"; shipmentRevision: number }>
  | Readonly<{ status: "DUPLICATE"; shipmentRevision: number }>
  | Readonly<{ status: "IDEMPOTENCY_CONFLICT"; shipmentRevision: number }>
  | Readonly<{ status: "REVISION_CONFLICT"; shipmentRevision: number }>;

/** Persistence port must enforce idempotency and optimistic shipment revisions. */
export interface DeliveryShipmentsPort {
  get(
    storeId: string,
    shipmentId: string,
  ): Promise<Delivery.DeliveryShipmentSnapshot | null>;
  findByProviderReference(
    storeId: string,
    providerAccountId: string,
    providerShipmentReference: string,
  ): Promise<Delivery.DeliveryShipmentSnapshot | null>;
  listOperations(
    storeId: string,
    shipmentId: string,
  ): Promise<readonly Delivery.DeliveryShipmentOperationSnapshot[]>;
  listTrackingEvents(
    storeId: string,
    shipmentId: string,
  ): Promise<readonly Delivery.DeliveryTrackingEventSnapshot[]>;
}

/** One transaction: inbox dedupe, aggregate CAS, tracking append and outbox append. */
export interface DeliveryUnitOfWorkPort {
  commit(
    record: DeliveryAtomicMutationRecord,
  ): Promise<DeliveryAtomicMutationResult>;
}

export type DeliveryDomainEvent =
  | Readonly<{
      type: "delivery.shipment.created";
      payload: DeliveryEvents.ShipmentCreated;
    }>
  | Readonly<{
      type: "delivery.shipment.state_changed";
      payload: DeliveryEvents.ShipmentStateChanged;
    }>
  | Readonly<{
      type: "delivery.shipment.tracking_updated";
      payload: DeliveryEvents.TrackingUpdated;
    }>
  | Readonly<{
      type: "delivery.shipment.label_available";
      payload: DeliveryEvents.LabelAvailable;
    }>
  | Readonly<{
      type: "delivery.shipment.operation_failed";
      payload: DeliveryEvents.OperationFailed;
    }>;

export interface DeliveryWorkflowPort {
  startConfigureProviderAccount(
    params: Delivery.ConfigureDeliveryProviderAccountParams,
  ): Promise<Delivery.ConfigureDeliveryProviderAccountResult>;
  startCreateShipment(
    params: Delivery.CreateDeliveryShipmentParams,
  ): Promise<Delivery.CreateDeliveryShipmentResult>;
  startCancelShipment(
    params: Delivery.CancelDeliveryShipmentParams,
  ): Promise<Delivery.DeliveryOperationAcceptedResult>;
  startReconcileShipment(
    params: Delivery.ReconcileDeliveryShipmentParams,
  ): Promise<Delivery.DeliveryOperationAcceptedResult>;
  startProviderCompletion(
    params: Delivery.CompleteDeliveryProviderOperationParams,
    context: DeliveryProviderCompletionContext,
  ): Promise<Delivery.CompleteDeliveryProviderOperationResult>;
  startProviderEvent(
    params: Delivery.ReportDeliveryProviderEventParams,
    context: DeliveryProviderCompletionContext,
  ): Promise<Delivery.ReportDeliveryProviderEventResult>;
}
