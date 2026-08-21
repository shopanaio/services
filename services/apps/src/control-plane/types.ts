import type {
  AppInstallationStatus,
  AppLifecycleOperationType,
  AppManifest,
} from "@shopana/app-sdk";

export type AppLifecycleOperationStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";

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
  readonly organizationId: string;
  readonly storeId: string;
  readonly operationType: AppLifecycleOperationType;
}

export interface AppManifestSnapshot {
  readonly manifest: AppManifest;
  readonly hash: string;
}

export interface ResolvedCapabilityRoute {
  readonly capabilityRouteId: string;
  readonly installationId: string;
  readonly appCode: string;
  readonly appVersion: string;
  readonly organizationId: string;
  readonly storeId: string;
  readonly capability: string;
  readonly operation: string;
  readonly targetAction: string;
  readonly routeRevision: string;
}

export interface CapabilityRouteTarget {
  readonly aggregate: string;
  readonly aggregateId: string;
  readonly domain: string;
}
