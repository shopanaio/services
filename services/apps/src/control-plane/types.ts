import type {
  AppInstallationStatus,
  AppLifecycleOperationType,
  AppManifest,
} from "@shopana/app-sdk";

export type AppLifecycleOperationStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED";

export interface AppInstallationRecord {
  readonly id: string;
  readonly appCode: string;
  readonly organizationId: string;
  readonly storeId: string;
  readonly status: AppInstallationStatus;
  readonly installedVersion: string | null;
  readonly targetVersion: string | null;
  readonly manifestHash: string | null;
  readonly configuration: Readonly<Record<string, unknown>>;
  readonly configurationVersion: number;
  readonly installedByUserId: string | null;
  readonly healthStatus: "UNKNOWN" | "HEALTHY" | "DEGRADED" | "UNHEALTHY";
  readonly lastErrorCode: string | null;
  readonly lastErrorMessage: string | null;
  readonly installedAt: string | null;
  readonly suspendedAt: string | null;
  readonly uninstalledAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AppLifecycleOperationRecord {
  readonly id: string;
  readonly installationId: string;
  readonly type: AppLifecycleOperationType;
  readonly status: AppLifecycleOperationStatus;
  readonly targetVersion: string;
  readonly previousInstallationStatus: AppInstallationStatus | null;
  readonly idempotencyKey: string;
  readonly workflowId: string;
  readonly actorType: "USER" | "SERVICE" | "SYSTEM";
  readonly actorId: string | null;
  readonly correlationId: string | null;
  readonly errorCode: string | null;
  readonly errorMessage: string | null;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AppLifecycleWorkflowInput {
  readonly installationId: string;
  readonly operationId: string;
}

export interface AppManifestSnapshot {
  readonly manifest: AppManifest;
  readonly hash: string;
}

export interface ResolvedCapabilityRoute {
  readonly installationId: string;
  readonly appCode: string;
  readonly appVersion: string;
  readonly organizationId: string;
  readonly storeId: string;
  readonly capability: string;
  readonly operation: string;
  readonly targetAction: string;
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

export type SalesChannelHealthStatus =
  | "UNKNOWN"
  | "HEALTHY"
  | "DEGRADED"
  | "UNHEALTHY";

export type SalesChannelOperationType =
  | "CONNECT"
  | "UPDATE"
  | "SUSPEND"
  | "RESUME"
  | "DISCONNECT";

export interface SalesChannelSpecificationSnapshotRecord {
  readonly id: string;
  readonly installationId: string;
  readonly appCode: string;
  readonly appVersion: string;
  readonly manifestHash: string;
  readonly handle: string;
  readonly label: string;
  readonly definition: Readonly<Record<string, unknown>>;
  readonly definitionHash: string;
  readonly createdAt: string;
}

export interface SalesChannelConnectionRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly storeId: string;
  readonly installationId: string;
  readonly specificationSnapshotId: string;
  readonly displayName: string;
  readonly externalAccountId: string | null;
  readonly externalAccountLabel: string | null;
  readonly status: SalesChannelConnectionStatus;
  readonly configuration: Readonly<Record<string, unknown>>;
  readonly configurationVersion: number;
  readonly healthStatus: SalesChannelHealthStatus;
  readonly lastErrorCode: string | null;
  readonly lastErrorMessage: string | null;
  readonly connectedAt: string | null;
  readonly suspendedAt: string | null;
  readonly disconnectedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SalesChannelOperationRecord {
  readonly id: string;
  readonly connectionId: string;
  readonly type: SalesChannelOperationType;
  readonly status: AppLifecycleOperationStatus;
  readonly targetSpecificationId: string | null;
  readonly idempotencyKey: string;
  readonly workflowId: string;
  readonly actorType: "USER" | "APP" | "SERVICE" | "SYSTEM";
  readonly actorId: string | null;
  readonly correlationId: string | null;
  readonly previousConnectionStatus: SalesChannelConnectionStatus | null;
  readonly errorCode: string | null;
  readonly errorMessage: string | null;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
