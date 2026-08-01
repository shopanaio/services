/**
 * Apps service broker action types
 */

import type {
  PaymentProviderCancelRequest,
  PaymentProviderCaptureRequest,
  PaymentProviderConfigurationValidationRequest,
  PaymentProviderConfigurationValidationResult,
  PaymentProviderConfirmRequest,
  PaymentProviderCreatePaymentRequest,
  PaymentProviderMethodDiscoveryRequest,
  PaymentProviderMethodDiscoveryResult,
  PaymentProviderOperationResult,
  PaymentProviderReconcileRequest,
  PaymentProviderReconcileResult,
  PaymentProviderRefundRequest,
  PaymentProviderVoidRequest,
} from "./payments.js";
import type {
  DeliveryProviderCancelShipmentRequest,
  DeliveryProviderConfigurationValidationRequest,
  DeliveryProviderConfigurationValidationResult,
  DeliveryProviderCreateShipmentRequest,
  DeliveryProviderGetShipmentRequest,
  DeliveryProviderLocationResolveRequest,
  DeliveryProviderLocationResolveResult,
  DeliveryProviderLocationSearchRequest,
  DeliveryProviderLocationSearchResult,
  DeliveryProviderRateRequest,
  DeliveryProviderRateResult,
  DeliveryProviderReconcileShipmentRequest,
  DeliveryProviderReconcileShipmentResult,
  DeliveryProviderShipmentOperationResult,
} from "./delivery.js";

export type AppInstallationStatus =
  | "PENDING_CONSENT"
  | "INSTALLING"
  | "ACTIVE"
  | "INSTALL_FAILED"
  | "SUSPENDING"
  | "SUSPENDED"
  | "RESUMING"
  | "UPDATING"
  | "UPDATE_FAILED"
  | "UNINSTALLING"
  | "UNINSTALLED"
  | "UNINSTALL_FAILED";

export interface AppLifecycleAcceptedResult {
  installationId: string;
  operationId: string;
  workflowId: string;
  status: AppInstallationStatus;
  duplicate: boolean;
}

export interface InstallAppParams {
  appCode: string;
  organizationId: string;
  storeId: string;
  configuration?: Record<string, unknown>;
  grantedScopes?: string[];
  secrets?: Record<string, string>;
  installedByUserId?: string;
  idempotencyKey: string;
  correlationId?: string;
}

export interface UpdateAppParams {
  installationId: string;
  storeId: string;
  configuration?: Record<string, unknown>;
  expectedConfigurationVersion?: number;
  grantedScopes?: string[];
  secrets?: Record<string, string>;
  idempotencyKey: string;
  userId?: string;
  correlationId?: string;
}

export interface SuspendAppParams {
  installationId: string;
  storeId: string;
  idempotencyKey: string;
  userId?: string;
  correlationId?: string;
}

export interface ResumeAppParams {
  installationId: string;
  storeId: string;
  idempotencyKey: string;
  userId?: string;
  correlationId?: string;
}

export interface UninstallAppParams {
  installationId: string;
  storeId: string;
  idempotencyKey: string;
  userId?: string;
  correlationId?: string;
}

export interface ExecuteCapabilityParams {
  storeId: string;
  capability: string;
  operation: string;
  installationId?: string;
  /** Manifest action key required for Commerce Function invocations. */
  functionKey?: string;
  target?: CapabilityTarget;
  input?: unknown;
  correlationId?: string;
  executionId?: string;
  functionBindingId?: string;
  deadlineAt?: string;
  configurationSnapshot?: unknown;
}

export interface ListCapabilityRoutesParams {
  storeId: string;
  capability: string;
  operation: string;
}

export interface CapabilityRoute {
  capabilityRouteId: string;
  installationId: string;
  appCode: string;
  appVersion: string;
  /** Manifest action key used to verify a Commerce Function binding. */
  functionKey: string;
  routeRevision: string;
}

export interface ListCapabilityRoutesResult {
  routes: CapabilityRoute[];
}

export interface CapabilityTarget {
  aggregate: string;
  aggregateId: string;
  domain: string;
}

export interface ExecuteCapabilityResult<TData = unknown> {
  capabilityRouteId: string;
  installationId: string;
  appCode: string;
  appVersion: string;
  routeRevision: string;
  data: TData;
}

export interface PaymentProviderCapabilityInvocation<
  TOperation extends string,
  TInput,
> extends Omit<
    ExecuteCapabilityParams,
    "capability" | "operation" | "installationId" | "input"
  > {
  capability: "payments.provider";
  operation: TOperation;
  installationId: string;
  input: TInput;
}

/** Typed Apps invocation envelope for every payment provider operation. */
export type ExecutePaymentProviderCapabilityParams =
  | PaymentProviderCapabilityInvocation<
      "validateConfiguration",
      PaymentProviderConfigurationValidationRequest
    >
  | PaymentProviderCapabilityInvocation<
      "getMethods",
      PaymentProviderMethodDiscoveryRequest
    >
  | PaymentProviderCapabilityInvocation<
      "createPayment",
      PaymentProviderCreatePaymentRequest
    >
  | PaymentProviderCapabilityInvocation<
      "confirmPayment",
      PaymentProviderConfirmRequest
    >
  | PaymentProviderCapabilityInvocation<"cancel", PaymentProviderCancelRequest>
  | PaymentProviderCapabilityInvocation<
      "capture",
      PaymentProviderCaptureRequest
    >
  | PaymentProviderCapabilityInvocation<"void", PaymentProviderVoidRequest>
  | PaymentProviderCapabilityInvocation<"refund", PaymentProviderRefundRequest>
  | PaymentProviderCapabilityInvocation<
      "reconcile",
      PaymentProviderReconcileRequest
    >;

export type ExecutePaymentProviderCapabilityResult = ExecuteCapabilityResult<
  | PaymentProviderConfigurationValidationResult
  | PaymentProviderMethodDiscoveryResult
  | PaymentProviderOperationResult
  | PaymentProviderReconcileResult
>;

export interface ListPaymentProviderRoutesParams {
  storeId: string;
  capability: "payments.provider";
  operation:
    | "validateConfiguration"
    | "getMethods"
    | "createPayment"
    | "confirmPayment"
    | "cancel"
    | "capture"
    | "void"
    | "refund"
    | "reconcile";
}

export interface DeliveryProviderCapabilityInvocation<
  TOperation extends string,
  TInput,
> extends Omit<
    ExecuteCapabilityParams,
    "capability" | "operation" | "installationId" | "input"
  > {
  capability: "delivery.provider";
  operation: TOperation;
  installationId: string;
  input: TInput;
}

/** Typed Apps invocation envelope for every delivery provider operation. */
export type ExecuteDeliveryProviderCapabilityParams =
  | DeliveryProviderCapabilityInvocation<
      "validateConfiguration",
      DeliveryProviderConfigurationValidationRequest
    >
  | DeliveryProviderCapabilityInvocation<
      "quoteRates",
      DeliveryProviderRateRequest
    >
  | DeliveryProviderCapabilityInvocation<
      "searchLocations",
      DeliveryProviderLocationSearchRequest
    >
  | DeliveryProviderCapabilityInvocation<
      "resolveLocation",
      DeliveryProviderLocationResolveRequest
    >
  | DeliveryProviderCapabilityInvocation<
      "createShipment",
      DeliveryProviderCreateShipmentRequest
    >
  | DeliveryProviderCapabilityInvocation<
      "cancelShipment",
      DeliveryProviderCancelShipmentRequest
    >
  | DeliveryProviderCapabilityInvocation<
      "getShipment",
      DeliveryProviderGetShipmentRequest
    >
  | DeliveryProviderCapabilityInvocation<
      "reconcileShipment",
      DeliveryProviderReconcileShipmentRequest
    >;

export type ExecuteDeliveryProviderCapabilityResult = ExecuteCapabilityResult<
  | DeliveryProviderConfigurationValidationResult
  | DeliveryProviderRateResult
  | DeliveryProviderLocationSearchResult
  | DeliveryProviderLocationResolveResult
  | DeliveryProviderShipmentOperationResult
  | DeliveryProviderReconcileShipmentResult
>;

export interface ListDeliveryProviderRoutesParams {
  storeId: string;
  capability: "delivery.provider";
  operation:
    | "validateConfiguration"
    | "quoteRates"
    | "searchLocations"
    | "resolveLocation"
    | "createShipment"
    | "cancelShipment"
    | "getShipment"
    | "reconcileShipment";
}

export interface AssignCapabilityParams {
  storeId: string;
  installationId: string;
  capability: string;
  target: CapabilityTarget;
  precedence?: number;
}

export interface AssignCapabilityResult {
  assignmentIds: string[];
}

export interface UnassignCapabilityParams {
  storeId: string;
  installationId: string;
  capability: string;
  target: CapabilityTarget;
}

export interface UnassignCapabilityResult {
  removed: number;
}
