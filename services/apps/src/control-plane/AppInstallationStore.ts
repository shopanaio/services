import { createHash } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import type {
  AppInstallationStatus,
  AppLifecycleOperationType,
  AppManifest,
} from "@shopana/app-sdk";
import type {
  AppCapabilityBindingRecord,
} from "../repositories/capability/AppCapabilityRepository.js";
import type {
  AppManifestSnapshotRecord,
} from "../repositories/manifest/AppManifestSnapshotRepository.js";
import { Repository } from "../repositories/Repository.js";
import type {
  AppInstallationRecord,
  AppLifecycleOperationRecord,
  AppManifestSnapshot,
  CapabilityRouteTarget,
  ResolvedCapabilityRoute,
} from "./types.js";
import { snapshotManifest } from "./manifest.js";

interface ActorInput {
  readonly type: "USER" | "SERVICE" | "SYSTEM";
  readonly id?: string;
}

interface BeginInstallInput {
  readonly appCode: string;
  readonly organizationId: string;
  readonly storeId: string;
  readonly targetVersion: string;
  readonly configuration: Readonly<Record<string, unknown>>;
  readonly grantedScopes: readonly string[];
  readonly snapshot: AppManifestSnapshot;
  readonly installedByUserId?: string;
  readonly idempotencyKey: string;
  readonly actor: ActorInput;
  readonly correlationId?: string;
}

interface BeginExistingOperationInput {
  readonly installationId: string;
  readonly storeId: string;
  readonly type: Exclude<AppLifecycleOperationType, "INSTALL">;
  readonly expectedStatuses: readonly AppInstallationStatus[];
  readonly transitionStatus: AppInstallationStatus;
  readonly targetVersion: string;
  readonly idempotencyKey: string;
  readonly actor: ActorInput;
  readonly correlationId?: string;
  readonly configuration?: Readonly<Record<string, unknown>>;
  readonly expectedConfigurationVersion?: number;
  readonly grantedScopes?: readonly string[];
  readonly snapshot?: AppManifestSnapshot;
}

export interface BegunLifecycleOperation {
  readonly installation: AppInstallationRecord;
  readonly operation: AppLifecycleOperationRecord;
  readonly duplicate: boolean;
}

@Injectable()
export class AppInstallationStore {
  constructor(
    @Inject(Repository)
    private readonly repository: Repository,
  ) {}

  beginInstall(
    input: BeginInstallInput,
  ): Promise<BegunLifecycleOperation> {
    return this.repository.runInTransaction(async () => {
      const current =
        await this.repository.installation.findNonTerminalByStoreAndAppForUpdate(
          input.storeId,
          input.appCode,
        );
      if (current) {
        const duplicate =
          await this.repository.lifecycleOperation.findByIdempotency(
            current.id,
            input.idempotencyKey,
          );
        if (duplicate) {
          assertDuplicateMatches(
            duplicate,
            "INSTALL",
            input.targetVersion,
          );
          return {
            installation: current,
            operation: duplicate,
            duplicate: true,
          };
        }
        if (current.status !== "INSTALL_FAILED") {
          throw new Error(
            `App "${input.appCode}" already has a non-terminal installation for store "${input.storeId}"`,
          );
        }

        const installation = await this.repository.installation.update(
          current.id,
          {
            status: "INSTALLING",
            targetVersion: input.targetVersion,
            configuration: input.configuration,
            configurationVersion: current.configurationVersion + 1,
            installedByUserId:
              input.installedByUserId ?? current.installedByUserId,
            lastErrorCode: null,
            lastErrorMessage: null,
          },
        );
        if (!installation) {
          throw new Error(
            `App installation "${current.id}" disappeared during install`,
          );
        }
        await this.repository.scope.replace(
          current.id,
          input.grantedScopes,
        );
        await this.repository.manifestSnapshot.save(
          current.id,
          input.snapshot,
        );
        const operation = await this.createOperation({
          installationId: current.id,
          type: "INSTALL",
          targetVersion: input.targetVersion,
          previousInstallationStatus: "INSTALL_FAILED",
          idempotencyKey: input.idempotencyKey,
          actor: input.actor,
          correlationId: input.correlationId,
        });
        return { installation, operation, duplicate: false };
      }

      const installation = await this.repository.installation.create({
        appCode: input.appCode,
        organizationId: input.organizationId,
        storeId: input.storeId,
        status: "INSTALLING",
        targetVersion: input.targetVersion,
        configuration: input.configuration,
        configurationVersion: 1,
        installedByUserId: input.installedByUserId,
      });
      await this.repository.scope.replace(
        installation.id,
        input.grantedScopes,
      );
      await this.repository.manifestSnapshot.save(
        installation.id,
        input.snapshot,
      );
      const operation = await this.createOperation({
        installationId: installation.id,
        type: "INSTALL",
        targetVersion: input.targetVersion,
        previousInstallationStatus: "PENDING_CONSENT",
        idempotencyKey: input.idempotencyKey,
        actor: input.actor,
        correlationId: input.correlationId,
      });
      return { installation, operation, duplicate: false };
    });
  }

  beginExistingOperation(
    input: BeginExistingOperationInput,
  ): Promise<BegunLifecycleOperation> {
    return this.repository.runInTransaction(async () => {
      const installation =
        await this.repository.installation.lockByIdAndStore(
          input.installationId,
          input.storeId,
        );
      if (!installation) {
        throw new Error(
          `App installation "${input.installationId}" not found`,
        );
      }

      const duplicate =
        await this.repository.lifecycleOperation.findByIdempotency(
          input.installationId,
          input.idempotencyKey,
        );
      if (duplicate) {
        assertDuplicateMatches(
          duplicate,
          input.type,
          input.targetVersion,
        );
        return { installation, operation: duplicate, duplicate: true };
      }
      if (!input.expectedStatuses.includes(installation.status)) {
        throw new Error(
          `Cannot ${input.type.toLowerCase()} App installation "${input.installationId}" from status "${installation.status}"`,
        );
      }
      if (
        input.expectedConfigurationVersion !== undefined &&
        installation.configurationVersion !==
          input.expectedConfigurationVersion
      ) {
        throw new Error(
          `App installation configuration version conflict: expected ${input.expectedConfigurationVersion}, received ${installation.configurationVersion}`,
        );
      }

      let previousStatus = installation.status;
      if (
        input.type === "UPDATE" &&
        installation.status === "UPDATE_FAILED"
      ) {
        previousStatus =
          (await this.repository.lifecycleOperation.findLatestFailedUpdatePreviousStatus(
            input.installationId,
          )) ?? previousStatus;
      }

      const updated = await this.repository.installation.update(
        input.installationId,
        {
          status: input.transitionStatus,
          targetVersion: input.targetVersion,
          lastErrorCode: null,
          lastErrorMessage: null,
          ...(input.configuration === undefined
            ? {}
            : {
                configuration: input.configuration,
                configurationVersion:
                  installation.configurationVersion + 1,
              }),
        },
      );
      if (!updated) {
        throw new Error(
          `App installation "${input.installationId}" disappeared during lifecycle transition`,
        );
      }

      if (input.grantedScopes) {
        await this.repository.scope.replace(
          input.installationId,
          input.grantedScopes,
        );
      }
      if (input.snapshot) {
        await this.repository.manifestSnapshot.save(
          input.installationId,
          input.snapshot,
        );
      }
      const operation = await this.createOperation({
        installationId: input.installationId,
        type: input.type,
        targetVersion: input.targetVersion,
        previousInstallationStatus: previousStatus,
        idempotencyKey: input.idempotencyKey,
        actor: input.actor,
        correlationId: input.correlationId,
      });

      if (input.type === "SUSPEND" || input.type === "UNINSTALL") {
        await this.repository.capability.setEnabled(
          input.installationId,
          false,
        );
      }
      if (input.type === "UNINSTALL") {
        await this.repository.secret.revokeAll(input.installationId);
      }
      return { installation: updated, operation, duplicate: false };
    });
  }

  findById(id: string): Promise<AppInstallationRecord | null> {
    return this.repository.installation.findById(id);
  }

  findByIdAndStore(
    id: string,
    storeId: string,
  ): Promise<AppInstallationRecord | null> {
    return this.repository.installation.findByIdAndStore(id, storeId);
  }

  findNonTerminalByStoreAndApp(
    storeId: string,
    appCode: string,
  ): Promise<AppInstallationRecord | null> {
    return this.repository.installation.findNonTerminalByStoreAndApp(
      storeId,
      appCode,
    );
  }

  findOperationById(
    id: string,
  ): Promise<AppLifecycleOperationRecord | null> {
    return this.repository.lifecycleOperation.findById(id);
  }

  listGrantedScopes(
    installationId: string,
  ): Promise<readonly string[]> {
    return this.repository.scope.listGranted(installationId);
  }

  listByStore(
    storeId: string,
    statuses?: readonly AppInstallationStatus[],
  ): Promise<AppInstallationRecord[]> {
    return this.repository.installation.listByStore(storeId, statuses);
  }

  listByOrganization(
    organizationId: string,
    statuses?: readonly AppInstallationStatus[],
  ): Promise<AppInstallationRecord[]> {
    return this.repository.installation.listByOrganization(
      organizationId,
      statuses,
    );
  }

  listOperations(
    installationId: string,
  ): Promise<AppLifecycleOperationRecord[]> {
    return this.repository.lifecycleOperation.listByInstallation(
      installationId,
    );
  }

  listManifestSnapshots(
    installationId: string,
  ): Promise<AppManifestSnapshotRecord[]> {
    return this.repository.manifestSnapshot.listByInstallation(
      installationId,
    );
  }

  listCapabilityBindings(
    installationId: string,
  ): Promise<AppCapabilityBindingRecord[]> {
    return this.repository.capability.listByInstallation(
      installationId,
    );
  }

  configure(input: {
    readonly installationId: string;
    readonly expectedConfigurationVersion: number;
    readonly configuration: Readonly<Record<string, unknown>>;
    readonly grantedScopes?: readonly string[];
  }): Promise<AppInstallationRecord> {
    return this.repository.runInTransaction(async () => {
      const installation =
        await this.repository.installation.updateConfigurationForStore({
          id: input.installationId,
          expectedVersion: input.expectedConfigurationVersion,
          configuration: input.configuration,
        });
      if (!installation) {
        throw new Error(
          `App installation configuration version conflict: expected ${input.expectedConfigurationVersion}`,
        );
      }
      if (input.grantedScopes) {
        await this.repository.scope.replace(
          input.installationId,
          input.grantedScopes,
        );
      }
      return installation;
    });
  }

  async markOperationRunning(operationId: string): Promise<void> {
    if (
      await this.repository.lifecycleOperation.markRunning(operationId)
    ) {
      return;
    }
    const current =
      await this.repository.lifecycleOperation.findById(operationId);
    if (current?.status !== "RUNNING") {
      throw new Error(
        `Lifecycle operation "${operationId}" is not pending or running`,
      );
    }
  }

  completeOperation(
    operationId: string,
    manifest: AppManifest,
  ): Promise<AppInstallationRecord> {
    return this.repository.runInTransaction(async () => {
      const operation =
        await this.repository.lifecycleOperation.lockById(operationId);
      if (!operation) {
        throw new Error(`Lifecycle operation "${operationId}" not found`);
      }
      const installation =
        await this.repository.installation.findById(
          operation.installationId,
        );
      if (!installation) {
        throw new Error(
          `App installation "${operation.installationId}" not found`,
        );
      }
      if (operation.status === "SUCCEEDED") {
        return installation;
      }

      let nextStatus: AppInstallationStatus;
      const update: Parameters<
        Repository["installation"]["update"]
      >[1] = {
        targetVersion: null,
        lastErrorCode: null,
        lastErrorMessage: null,
      };
      switch (operation.type) {
        case "INSTALL":
          nextStatus = "ACTIVE";
          update.installedVersion = operation.targetVersion;
          update.manifestHash = snapshotManifest(manifest).hash;
          update.installedAt = new Date().toISOString();
          update.healthStatus = "HEALTHY";
          await this.repository.capability.sync(installation, manifest);
          break;
        case "UPDATE":
          nextStatus =
            operation.previousInstallationStatus === "SUSPENDED"
              ? "SUSPENDED"
              : "ACTIVE";
          update.installedVersion = operation.targetVersion;
          update.manifestHash = snapshotManifest(manifest).hash;
          await this.repository.capability.sync(installation, manifest);
          if (nextStatus === "SUSPENDED") {
            await this.repository.capability.setEnabled(
              installation.id,
              false,
            );
          }
          break;
        case "SUSPEND":
          nextStatus = "SUSPENDED";
          update.suspendedAt = new Date().toISOString();
          break;
        case "RESUME":
          nextStatus = "ACTIVE";
          update.suspendedAt = null;
          await this.repository.capability.setEnabled(
            installation.id,
            true,
          );
          break;
        case "UNINSTALL":
          nextStatus = "UNINSTALLED";
          update.uninstalledAt = new Date().toISOString();
          update.healthStatus = "UNKNOWN";
          await this.repository.capability.deleteByInstallation(
            installation.id,
          );
          await this.repository.scope.revokeAll(installation.id);
          break;
      }
      update.status = nextStatus;

      const completed = await this.repository.installation.update(
        installation.id,
        update,
      );
      if (!completed) {
        throw new Error(
          `App installation "${installation.id}" disappeared while completing operation`,
        );
      }
      await this.repository.lifecycleOperation.markSucceeded(operationId);
      return completed;
    });
  }

  failOperation(operationId: string, error: unknown): Promise<void> {
    return this.repository.runInTransaction(async () => {
      const operation =
        await this.repository.lifecycleOperation.lockById(operationId);
      if (!operation || operation.status === "SUCCEEDED") {
        return;
      }
      const failureStatus: AppInstallationStatus =
        operation.type === "INSTALL"
          ? "INSTALL_FAILED"
          : operation.type === "UPDATE"
            ? "UPDATE_FAILED"
            : operation.type === "UNINSTALL"
              ? "UNINSTALL_FAILED"
              : operation.previousInstallationStatus === "SUSPENDED"
                ? "SUSPENDED"
                : "ACTIVE";
      const normalized = normalizeError(error);

      await this.repository.installation.update(
        operation.installationId,
        {
          status: failureStatus,
          lastErrorCode: normalized.code,
          lastErrorMessage: normalized.message,
          targetVersion: null,
          healthStatus: "UNHEALTHY",
        },
      );
      await this.repository.lifecycleOperation.markFailed(
        operationId,
        normalized,
      );
      if (operation.type === "SUSPEND" || operation.type === "RESUME") {
        await this.repository.capability.setEnabled(
          operation.installationId,
          failureStatus === "ACTIVE",
        );
      }
    });
  }

  resolveCapabilityRoute(
    storeId: string,
    capability: string,
    operation: string,
    target?: CapabilityRouteTarget,
  ): Promise<ResolvedCapabilityRoute | null> {
    return this.repository.capability.resolveRoute(
      storeId,
      capability,
      operation,
      target,
    );
  }

  assignCapabilityResource(input: {
    readonly storeId: string;
    readonly installationId: string;
    readonly capability: string;
    readonly target: CapabilityRouteTarget;
    readonly precedence: number;
  }): Promise<string[]> {
    return this.repository.runInTransaction(() =>
      this.repository.capability.assignResource(input),
    );
  }

  unassignCapabilityResource(input: {
    readonly storeId: string;
    readonly installationId: string;
    readonly capability: string;
    readonly target: CapabilityRouteTarget;
  }): Promise<number> {
    return this.repository.runInTransaction(() =>
      this.repository.capability.unassignResource(input),
    );
  }

  private createOperation(input: {
    readonly installationId: string;
    readonly type: AppLifecycleOperationType;
    readonly targetVersion: string;
    readonly previousInstallationStatus: AppInstallationStatus;
    readonly idempotencyKey: string;
    readonly actor: ActorInput;
    readonly correlationId?: string;
  }): Promise<AppLifecycleOperationRecord> {
    return this.repository.lifecycleOperation.create({
      installationId: input.installationId,
      type: input.type,
      targetVersion: input.targetVersion,
      previousInstallationStatus: input.previousInstallationStatus,
      idempotencyKey: input.idempotencyKey,
      workflowId: lifecycleWorkflowId(
        input.installationId,
        input.type,
        input.targetVersion,
        input.idempotencyKey,
      ),
      actorType: input.actor.type,
      actorId: input.actor.id,
      correlationId: input.correlationId,
    });
  }

}

function lifecycleWorkflowId(
  installationId: string,
  operation: AppLifecycleOperationType,
  targetVersion: string,
  idempotencyKey: string,
): string {
  const requestHash = createHash("sha256")
    .update(idempotencyKey)
    .digest("hex")
    .slice(0, 16);
  return `apps:lifecycle:${installationId}:${operation}:${targetVersion}:${requestHash}`;
}

function assertDuplicateMatches(
  operation: AppLifecycleOperationRecord,
  expectedType: AppLifecycleOperationType,
  expectedTargetVersion: string,
): void {
  if (
    operation.type !== expectedType ||
    operation.targetVersion !== expectedTargetVersion
  ) {
    throw new Error(
      `App lifecycle idempotency key is already used for ${operation.type}:${operation.targetVersion}`,
    );
  }
}

function normalizeError(error: unknown): {
  readonly code: string;
  readonly message: string;
} {
  if (error instanceof Error) {
    return {
      code: error.name || "APP_LIFECYCLE_ERROR",
      message: error.message,
    };
  }
  return {
    code: "APP_LIFECYCLE_ERROR",
    message: String(error),
  };
}
