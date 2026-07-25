/**
 * Apps service broker action types
 */

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
  system?: boolean;
  workflowId?: string;
}

export interface UpdateAppParams {
  installationId: string;
  configuration?: Record<string, unknown>;
  expectedConfigurationVersion?: number;
  grantedScopes?: string[];
  secrets?: Record<string, string>;
  idempotencyKey: string;
  correlationId?: string;
}

export interface SuspendAppParams {
  installationId: string;
  idempotencyKey: string;
  correlationId?: string;
}

export interface ResumeAppParams {
  installationId: string;
  idempotencyKey: string;
  correlationId?: string;
}

export interface UninstallAppParams {
  installationId: string;
  idempotencyKey: string;
  correlationId?: string;
  system?: boolean;
  workflowId?: string;
}

export interface ExecuteCapabilityParams {
  storeId: string;
  capability: string;
  operation: string;
  input?: unknown;
  correlationId?: string;
}

export interface ExecuteCapabilityResult {
  installationId: string;
  appCode: string;
  data: unknown;
}

export type SalesChannelConnectionStatus =
  | "DRAFT"
  | "CONNECTING"
  | "ACTIVE"
  | "CONNECT_FAILED"
  | "UPDATING"
  | "UPDATE_FAILED"
  | "SUSPENDING"
  | "SUSPENDED"
  | "RESUMING"
  | "DISCONNECTING"
  | "DISCONNECTED"
  | "DISCONNECT_FAILED";

export interface ResolvedSalesChannelConnection {
  id: string;
  organizationId: string;
  storeId: string;
  installationId: string;
  appCode: string;
  appVersion: string;
  specificationHandle: string;
  status: "ACTIVE";
}

export interface ResolveSalesChannelConnectionParams {
  connectionId: string;
  storeId?: string;
}

export interface ListSalesChannelConnectionsParams {
  storeId: string;
  installationId?: string;
}

export interface InvokeSalesChannelConnectionParams {
  connectionId: string;
  contract:
    | "connect"
    | "update"
    | "disconnect"
    | "suspend"
    | "resume"
    | "health";
  input?: unknown;
  correlationId?: string;
}

export interface ResolveOnlineStoreParams {
  storeId: string;
}

export interface GetSalesChannelSpecificationParams {
  specificationId: string;
  storeId?: string;
}

export interface SalesChannelSpecificationResult {
  id: string;
  appCode: string;
  appVersion: string;
  handle: string;
  label: string;
  definition: Record<string, unknown>;
}
