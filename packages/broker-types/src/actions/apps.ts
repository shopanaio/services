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
