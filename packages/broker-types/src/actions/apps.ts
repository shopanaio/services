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

export interface ExecuteCapabilityResult {
  capabilityRouteId: string;
  installationId: string;
  appCode: string;
  appVersion: string;
  routeRevision: string;
  data: unknown;
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
