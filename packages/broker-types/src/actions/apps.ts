/**
 * Apps service broker action types
 */

import type {
  NotificationChannel,
  NotificationDeliveryInput,
  NotificationDeliveryReceipt,
  NotificationProviderTestInput,
  NotificationProviderTestResult,
} from "./notifications.js";

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

// ============================================================================
// Execute Plugin Action
// ============================================================================

export interface ExecuteParams {
  domain: string;
  operation: string;
  params: unknown;
}

export interface ExecuteWarning {
  code: string;
  message: string;
  details?: unknown;
}

export interface ExecuteResult {
  data: unknown[];
  warnings: ExecuteWarning[];
}

// ============================================================================
// Side-effect-safe assigned execution
// ============================================================================

export type AssignedNotificationOperation = "deliver" | "testConnection";

export interface ExecuteAssignedParams {
  storeId: string;
  domain: "notifications";
  capability: NotificationChannel;
  operation: AssignedNotificationOperation;
  assignment: {
    aggregate: "notifications";
    aggregateId: NotificationChannel;
  };
  input: NotificationDeliveryInput | NotificationProviderTestInput;
  idempotencyKey: string;
}

export interface ExecuteAssignedResult {
  providerCode: string;
  slotId: string;
  assignmentId: string;
  receipt:
    | NotificationDeliveryReceipt
    | NotificationProviderTestResult;
}

export interface NotificationProviderRouteStatusParams {
  storeId: string;
  channel: NotificationChannel;
}

export interface NotificationProviderRouteStatusResult {
  channel: NotificationChannel;
  configured: boolean;
  providerCode?: string;
  slotId?: string;
  assignmentId?: string;
  status?: "active" | "inactive" | "maintenance" | "deprecated";
}

export interface ConfigureNotificationProviderParams {
  storeId: string;
  providerCode: string;
  channel: NotificationChannel;
  config: Record<string, unknown>;
  secretFields?: Record<string, string>;
  status?: "active" | "inactive";
}

export interface ConfigureNotificationProviderResult {
  providerCode: string;
  channel: NotificationChannel;
  slotId: string;
  assignmentId: string;
  maskedConfig: Record<string, unknown>;
}

export interface TestNotificationProviderParams {
  storeId: string;
  channel: NotificationChannel;
  input?: NotificationProviderTestInput;
}

export interface GetMaskedNotificationProviderConfigParams {
  storeId: string;
  channel: NotificationChannel;
}

export interface GetMaskedNotificationProviderConfigResult {
  providerCode: string;
  channel: NotificationChannel;
  status: string;
  config: Record<string, unknown>;
}
