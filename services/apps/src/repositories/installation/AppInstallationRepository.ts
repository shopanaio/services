import { createHash } from "node:crypto";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  notInArray,
} from "drizzle-orm";
import type {
  AppInstallationStatus,
  AppLifecycleOperationType,
  AppManifest,
} from "@shopana/app-sdk";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../../infrastructure/db/database.js";
import type {
  AppInstallationRecord,
  AppLifecycleOperationRecord,
  AppManifestSnapshot,
  ResolvedCapabilityRoute,
} from "../../control-plane/types.js";
import { snapshotManifest } from "../../control-plane/manifest.js";
import { BaseRepository } from "../BaseRepository.js";
import {
  appBindingAssignments,
  appBindings,
  appInstallationManifestSnapshots,
  appInstallationScopes,
  appInstallationSecrets,
  appInstallations,
  appLifecycleOperations,
  type AppInstallationModel,
  type AppLifecycleOperationModel,
} from "../models/index.js";

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

export class AppInstallationRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
  ) {
    super(db, txManager);
  }

  beginInstall(
    input: BeginInstallInput,
  ): Promise<BegunLifecycleOperation> {
    return this.txManager.run(async () => {
      const currentRows = await this.connection
        .select()
        .from(appInstallations)
        .where(
          and(
            eq(appInstallations.storeId, input.storeId),
            eq(appInstallations.appCode, input.appCode),
            ne(appInstallations.status, "UNINSTALLED"),
          ),
        )
        .limit(1)
        .for("update");
      const current = currentRows[0];

      if (current) {
        const duplicate = await this.findOperationByIdempotency(
          current.id,
          input.idempotencyKey,
        );
        if (duplicate) {
          return {
            installation: mapInstallation(current),
            operation: duplicate,
            duplicate: true,
          };
        }

        if (current.status !== "INSTALL_FAILED") {
          throw new Error(
            `App "${input.appCode}" already has a non-terminal installation for store "${input.storeId}"`,
          );
        }

        const installationRows = await this.connection
          .update(appInstallations)
          .set({
            status: "INSTALLING",
            targetVersion: input.targetVersion,
            configuration: { ...input.configuration },
            configurationVersion: current.configurationVersion + 1,
            installedByUserId:
              input.installedByUserId ?? current.installedByUserId,
            lastErrorCode: null,
            lastErrorMessage: null,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(appInstallations.id, current.id))
          .returning();
        const installation = requiredRow(
          installationRows[0],
          "Updated App installation",
        );

        await this.replaceScopes(current.id, input.grantedScopes);
        await this.saveSnapshot(current.id, input.snapshot);

        const operation = await this.createOperation({
          installationId: current.id,
          type: "INSTALL",
          targetVersion: input.targetVersion,
          previousInstallationStatus: "INSTALL_FAILED",
          idempotencyKey: input.idempotencyKey,
          actor: input.actor,
          correlationId: input.correlationId,
        });

        return {
          installation: mapInstallation(installation),
          operation,
          duplicate: false,
        };
      }

      const installationRows = await this.connection
        .insert(appInstallations)
        .values({
          appCode: input.appCode,
          organizationId: input.organizationId,
          storeId: input.storeId,
          status: "INSTALLING",
          targetVersion: input.targetVersion,
          configuration: { ...input.configuration },
          configurationVersion: 1,
          installedByUserId: input.installedByUserId ?? null,
        })
        .returning();
      const installation = requiredRow(
        installationRows[0],
        "Created App installation",
      );

      await this.replaceScopes(installation.id, input.grantedScopes);
      await this.saveSnapshot(installation.id, input.snapshot);

      const operation = await this.createOperation({
        installationId: installation.id,
        type: "INSTALL",
        targetVersion: input.targetVersion,
        previousInstallationStatus: "PENDING_CONSENT",
        idempotencyKey: input.idempotencyKey,
        actor: input.actor,
        correlationId: input.correlationId,
      });

      return {
        installation: mapInstallation(installation),
        operation,
        duplicate: false,
      };
    });
  }

  beginExistingOperation(
    input: BeginExistingOperationInput,
  ): Promise<BegunLifecycleOperation> {
    return this.txManager.run(async () => {
      const installationRows = await this.connection
        .select()
        .from(appInstallations)
        .where(eq(appInstallations.id, input.installationId))
        .limit(1)
        .for("update");
      const installation = installationRows[0];
      if (!installation) {
        throw new Error(
          `App installation "${input.installationId}" not found`,
        );
      }

      const duplicate = await this.findOperationByIdempotency(
        input.installationId,
        input.idempotencyKey,
      );
      if (duplicate) {
        return {
          installation: mapInstallation(installation),
          operation: duplicate,
          duplicate: true,
        };
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

      let previousInstallationStatus = installation.status;
      if (
        input.type === "UPDATE" &&
        installation.status === "UPDATE_FAILED"
      ) {
        const previousRows = await this.connection
          .select({
            previousInstallationStatus:
              appLifecycleOperations.previousInstallationStatus,
          })
          .from(appLifecycleOperations)
          .where(
            and(
              eq(
                appLifecycleOperations.installationId,
                input.installationId,
              ),
              eq(appLifecycleOperations.type, "UPDATE"),
              eq(appLifecycleOperations.status, "FAILED"),
              inArray(
                appLifecycleOperations.previousInstallationStatus,
                ["ACTIVE", "SUSPENDED"],
              ),
            ),
          )
          .orderBy(desc(appLifecycleOperations.createdAt))
          .limit(1);
        if (previousRows[0]?.previousInstallationStatus) {
          previousInstallationStatus =
            previousRows[0].previousInstallationStatus;
        }
      }

      const update: Partial<typeof appInstallations.$inferInsert> = {
        status: input.transitionStatus,
        targetVersion: input.targetVersion,
        lastErrorCode: null,
        lastErrorMessage: null,
        updatedAt: new Date().toISOString(),
      };
      if (input.configuration !== undefined) {
        update.configuration = { ...input.configuration };
        update.configurationVersion =
          installation.configurationVersion + 1;
      }

      const updatedRows = await this.connection
        .update(appInstallations)
        .set(update)
        .where(eq(appInstallations.id, input.installationId))
        .returning();
      const updated = requiredRow(
        updatedRows[0],
        "Updated App installation",
      );

      if (input.grantedScopes) {
        await this.replaceScopes(
          input.installationId,
          input.grantedScopes,
        );
      }
      if (input.snapshot) {
        await this.saveSnapshot(input.installationId, input.snapshot);
      }

      const operation = await this.createOperation({
        installationId: input.installationId,
        type: input.type,
        targetVersion: input.targetVersion,
        previousInstallationStatus,
        idempotencyKey: input.idempotencyKey,
        actor: input.actor,
        correlationId: input.correlationId,
      });

      if (input.type === "SUSPEND" || input.type === "UNINSTALL") {
        await this.setBindingsEnabled(input.installationId, false);
      }
      if (input.type === "UNINSTALL") {
        await this.connection
          .update(appInstallationSecrets)
          .set({
            revokedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(
                appInstallationSecrets.installationId,
                input.installationId,
              ),
              isNull(appInstallationSecrets.revokedAt),
            ),
          );
      }

      return {
        installation: mapInstallation(updated),
        operation,
        duplicate: false,
      };
    });
  }

  async findById(
    installationId: string,
  ): Promise<AppInstallationRecord | null> {
    const rows = await this.connection
      .select()
      .from(appInstallations)
      .where(eq(appInstallations.id, installationId))
      .limit(1);

    return rows[0] ? mapInstallation(rows[0]) : null;
  }

  async findOperationById(
    operationId: string,
  ): Promise<AppLifecycleOperationRecord | null> {
    const rows = await this.connection
      .select()
      .from(appLifecycleOperations)
      .where(eq(appLifecycleOperations.id, operationId))
      .limit(1);

    return rows[0] ? mapOperation(rows[0]) : null;
  }

  async listGrantedScopes(
    installationId: string,
  ): Promise<readonly string[]> {
    const rows = await this.connection
      .select({ scope: appInstallationScopes.scope })
      .from(appInstallationScopes)
      .where(
        and(
          eq(appInstallationScopes.installationId, installationId),
          isNull(appInstallationScopes.revokedAt),
        ),
      )
      .orderBy(asc(appInstallationScopes.scope));

    return Object.freeze(rows.map((row) => row.scope));
  }

  async markOperationRunning(operationId: string): Promise<void> {
    const rows = await this.connection
      .update(appLifecycleOperations)
      .set({
        status: "RUNNING",
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(appLifecycleOperations.id, operationId),
          eq(appLifecycleOperations.status, "PENDING"),
        ),
      )
      .returning({ id: appLifecycleOperations.id });

    if (rows.length !== 1) {
      const current = await this.findOperationById(operationId);
      if (current?.status !== "RUNNING") {
        throw new Error(
          `Lifecycle operation "${operationId}" is not pending or running`,
        );
      }
    }
  }

  completeOperation(
    operationId: string,
    manifest: AppManifest,
  ): Promise<AppInstallationRecord> {
    return this.txManager.run(async () => {
      const operationRows = await this.connection
        .select()
        .from(appLifecycleOperations)
        .where(eq(appLifecycleOperations.id, operationId))
        .limit(1)
        .for("update");
      const operation = operationRows[0];
      if (!operation) {
        throw new Error(`Lifecycle operation "${operationId}" not found`);
      }
      if (operation.status === "SUCCEEDED") {
        const existing = await this.findById(operation.installationId);
        if (!existing) {
          throw new Error(
            `App installation "${operation.installationId}" not found`,
          );
        }
        return existing;
      }

      let nextStatus: AppInstallationStatus;
      const update: Partial<typeof appInstallations.$inferInsert> = {
        targetVersion: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        updatedAt: new Date().toISOString(),
      };

      switch (operation.type) {
        case "INSTALL":
          nextStatus = "ACTIVE";
          update.installedVersion = operation.targetVersion;
          update.manifestHash = snapshotManifest(manifest).hash;
          update.installedAt = new Date().toISOString();
          update.healthStatus = "HEALTHY";
          await this.syncBindings(operation.installationId, manifest);
          break;
        case "UPDATE":
          nextStatus =
            operation.previousInstallationStatus === "SUSPENDED"
              ? "SUSPENDED"
              : "ACTIVE";
          update.installedVersion = operation.targetVersion;
          update.manifestHash = snapshotManifest(manifest).hash;
          await this.syncBindings(operation.installationId, manifest);
          if (nextStatus === "SUSPENDED") {
            await this.setBindingsEnabled(
              operation.installationId,
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
          await this.setBindingsEnabled(operation.installationId, true);
          break;
        case "UNINSTALL":
          nextStatus = "UNINSTALLED";
          update.uninstalledAt = new Date().toISOString();
          update.healthStatus = "UNKNOWN";
          await this.connection
            .delete(appBindings)
            .where(
              eq(appBindings.installationId, operation.installationId),
            );
          await this.connection
            .update(appInstallationScopes)
            .set({ revokedAt: new Date().toISOString() })
            .where(
              and(
                eq(
                  appInstallationScopes.installationId,
                  operation.installationId,
                ),
                isNull(appInstallationScopes.revokedAt),
              ),
            );
          break;
      }
      update.status = nextStatus;

      const installationRows = await this.connection
        .update(appInstallations)
        .set(update)
        .where(eq(appInstallations.id, operation.installationId))
        .returning();
      const installation = requiredRow(
        installationRows[0],
        "Completed App installation",
      );

      await this.connection
        .update(appLifecycleOperations)
        .set({
          status: "SUCCEEDED",
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(appLifecycleOperations.id, operationId));

      return mapInstallation(installation);
    });
  }

  failOperation(operationId: string, error: unknown): Promise<void> {
    return this.txManager.run(async () => {
      const operationRows = await this.connection
        .select()
        .from(appLifecycleOperations)
        .where(eq(appLifecycleOperations.id, operationId))
        .limit(1)
        .for("update");
      const operation = operationRows[0];
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

      await this.connection
        .update(appInstallations)
        .set({
          status: failureStatus,
          lastErrorCode: normalized.code,
          lastErrorMessage: normalized.message,
          targetVersion: null,
          healthStatus: "UNHEALTHY",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(appInstallations.id, operation.installationId));
      await this.connection
        .update(appLifecycleOperations)
        .set({
          status: "FAILED",
          errorCode: normalized.code,
          errorMessage: normalized.message,
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(appLifecycleOperations.id, operationId));

      if (operation.type === "SUSPEND" || operation.type === "RESUME") {
        await this.setBindingsEnabled(
          operation.installationId,
          failureStatus === "ACTIVE",
        );
      }
    });
  }

  async resolveCapabilityRoute(
    storeId: string,
    capability: string,
    operation: string,
  ): Promise<ResolvedCapabilityRoute | null> {
    const rows = await this.connection
      .select({
        installationId: appInstallations.id,
        appCode: appInstallations.appCode,
        appVersion: appInstallations.installedVersion,
        organizationId: appInstallations.organizationId,
        storeId: appInstallations.storeId,
        capability: appBindings.capability,
        operation: appBindings.operationContract,
        targetAction: appBindings.targetAction,
      })
      .from(appBindingAssignments)
      .innerJoin(
        appBindings,
        eq(appBindings.id, appBindingAssignments.slotId),
      )
      .innerJoin(
        appInstallations,
        eq(appInstallations.id, appBindings.installationId),
      )
      .where(
        and(
          eq(appBindingAssignments.storeId, storeId),
          eq(appBindingAssignments.aggregate, "apps"),
          eq(
            appBindingAssignments.aggregateId,
            capabilityRouteKey(capability, operation),
          ),
          eq(appBindingAssignments.domain, capability),
          eq(appBindingAssignments.status, "active"),
          eq(appBindings.status, "active"),
          eq(appBindings.capability, capability),
          eq(appBindings.operationContract, operation),
          eq(appInstallations.status, "ACTIVE"),
          isNotNull(appBindings.targetAppCode),
          isNotNull(appBindings.targetAction),
        ),
      )
      .orderBy(
        asc(appBindingAssignments.precedence),
        desc(appBindingAssignments.updatedAt),
      )
      .limit(1);
    const row = rows[0];
    if (!row || !row.appVersion) {
      return null;
    }

    return {
      installationId: row.installationId,
      appCode: row.appCode,
      appVersion: row.appVersion,
      organizationId: row.organizationId,
      storeId: row.storeId,
      capability: row.capability,
      operation: row.operation,
      targetAction: row.targetAction,
    };
  }

  private async findOperationByIdempotency(
    installationId: string,
    idempotencyKey: string,
  ): Promise<AppLifecycleOperationRecord | null> {
    const rows = await this.connection
      .select()
      .from(appLifecycleOperations)
      .where(
        and(
          eq(appLifecycleOperations.installationId, installationId),
          eq(appLifecycleOperations.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);

    return rows[0] ? mapOperation(rows[0]) : null;
  }

  private async createOperation(input: {
    readonly installationId: string;
    readonly type: AppLifecycleOperationType;
    readonly targetVersion: string;
    readonly previousInstallationStatus: AppInstallationStatus;
    readonly idempotencyKey: string;
    readonly actor: ActorInput;
    readonly correlationId?: string;
  }): Promise<AppLifecycleOperationRecord> {
    const workflowId = lifecycleWorkflowId(
      input.installationId,
      input.type,
      input.targetVersion,
      input.idempotencyKey,
    );
    const rows = await this.connection
      .insert(appLifecycleOperations)
      .values({
        installationId: input.installationId,
        type: input.type,
        status: "PENDING",
        targetVersion: input.targetVersion,
        previousInstallationStatus:
          input.previousInstallationStatus,
        idempotencyKey: input.idempotencyKey,
        workflowId,
        actorType: input.actor.type,
        actorId: input.actor.id ?? null,
        correlationId: input.correlationId ?? null,
      })
      .returning();

    return mapOperation(
      requiredRow(rows[0], "Created App lifecycle operation"),
    );
  }

  private async replaceScopes(
    installationId: string,
    scopes: readonly string[],
  ): Promise<void> {
    const normalized = [...new Set(scopes)].sort();
    const baseCondition = and(
      eq(appInstallationScopes.installationId, installationId),
      isNull(appInstallationScopes.revokedAt),
    );
    const revokeCondition =
      normalized.length > 0
        ? and(
            baseCondition,
            notInArray(appInstallationScopes.scope, normalized),
          )
        : baseCondition;

    await this.connection
      .update(appInstallationScopes)
      .set({ revokedAt: new Date().toISOString() })
      .where(revokeCondition);

    for (const scope of normalized) {
      await this.connection
        .insert(appInstallationScopes)
        .values({
          installationId,
          scope,
          revokedAt: null,
        })
        .onConflictDoUpdate({
          target: [
            appInstallationScopes.installationId,
            appInstallationScopes.scope,
          ],
          set: {
            revokedAt: null,
            grantedAt: new Date().toISOString(),
          },
        });
    }
  }

  private async saveSnapshot(
    installationId: string,
    snapshot: AppManifestSnapshot,
  ): Promise<void> {
    await this.connection
      .insert(appInstallationManifestSnapshots)
      .values({
        installationId,
        appCode: snapshot.manifest.code,
        version: snapshot.manifest.version,
        manifestHash: snapshot.hash,
        manifest: { ...snapshot.manifest },
      })
      .onConflictDoNothing({
        target: [
          appInstallationManifestSnapshots.installationId,
          appInstallationManifestSnapshots.version,
          appInstallationManifestSnapshots.manifestHash,
        ],
      });
  }

  private async syncBindings(
    installationId: string,
    manifest: AppManifest,
  ): Promise<void> {
    const installationRows = await this.connection
      .select()
      .from(appInstallations)
      .where(eq(appInstallations.id, installationId))
      .limit(1);
    const installation = installationRows[0];
    if (!installation) {
      throw new Error(`App installation "${installationId}" not found`);
    }

    const declaredRoutes = new Set<string>();
    for (const capability of manifest.capabilities) {
      for (const [operation, targetAction] of Object.entries(
        capability.operations,
      )) {
        const routeKey = capabilityRouteKey(capability.key, operation);
        declaredRoutes.add(routeKey);
        const currentRows = await this.connection
          .select()
          .from(appBindings)
          .where(
            and(
              eq(appBindings.installationId, installationId),
              eq(appBindings.capability, capability.key),
              eq(appBindings.operationContract, operation),
            ),
          )
          .limit(1);
        const current = currentRows[0];
        let slotId: string;

        if (current) {
          slotId = current.id;
          await this.connection
            .update(appBindings)
            .set({
              status: "active",
              targetAppCode: manifest.code,
              targetAction,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(appBindings.id, slotId));
        } else {
          const slotRows = await this.connection
            .insert(appBindings)
            .values({
              storeId: installation.storeId,
              status: "active",
              installationId,
              capability: capability.key,
              operationContract: operation,
              targetAppCode: manifest.code,
              targetAction,
            })
            .returning({ id: appBindings.id });
          slotId = requiredRow(slotRows[0], "Created App slot").id;
        }

        const assignmentScope = and(
          eq(appBindingAssignments.storeId, installation.storeId),
          eq(appBindingAssignments.aggregate, "apps"),
          eq(appBindingAssignments.aggregateId, routeKey),
          eq(appBindingAssignments.domain, capability.key),
        );
        await this.connection
          .update(appBindingAssignments)
          .set({
            status: "disabled",
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              assignmentScope,
              ne(appBindingAssignments.slotId, slotId),
            ),
          );

        const assignmentRows = await this.connection
          .select({ id: appBindingAssignments.id })
          .from(appBindingAssignments)
          .where(
            and(
              assignmentScope,
              eq(appBindingAssignments.slotId, slotId),
            ),
          )
          .limit(1);
        const assignment = assignmentRows[0];
        if (assignment) {
          await this.connection
            .update(appBindingAssignments)
            .set({
              status: "active",
              precedence: 0,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(appBindingAssignments.id, assignment.id));
        } else {
          await this.connection.insert(appBindingAssignments).values({
            storeId: installation.storeId,
            aggregate: "apps",
            aggregateId: routeKey,
            slotId,
            domain: capability.key,
            precedence: 0,
            status: "active",
          });
        }
      }
    }

    const existing = await this.connection
      .select({
        id: appBindings.id,
        capability: appBindings.capability,
        operationContract: appBindings.operationContract,
      })
      .from(appBindings)
      .where(eq(appBindings.installationId, installationId));
    const obsoleteIds = existing
      .filter(
        (row) =>
          !declaredRoutes.has(
            capabilityRouteKey(row.capability, row.operationContract),
          ),
      )
      .map((row) => row.id);
    if (obsoleteIds.length > 0) {
      await this.connection
        .delete(appBindings)
        .where(inArray(appBindings.id, obsoleteIds));
    }
  }

  private async setBindingsEnabled(
    installationId: string,
    enabled: boolean,
  ): Promise<void> {
    const slots = await this.connection
      .select({
        id: appBindings.id,
        storeId: appBindings.storeId,
        capability: appBindings.capability,
        operationContract: appBindings.operationContract,
      })
      .from(appBindings)
      .where(eq(appBindings.installationId, installationId));

    await this.connection
      .update(appBindings)
      .set({
        status: enabled ? "active" : "inactive",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(appBindings.installationId, installationId));

    if (slots.length === 0) {
      return;
    }
    await this.connection
      .update(appBindingAssignments)
      .set({
        status: enabled ? "active" : "disabled",
        updatedAt: new Date().toISOString(),
      })
      .where(
        inArray(
          appBindingAssignments.slotId,
          slots.map((slot) => slot.id),
        ),
      );

    if (enabled) {
      for (const slot of slots) {
        await this.connection
          .update(appBindingAssignments)
          .set({
            status: "disabled",
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(appBindingAssignments.storeId, slot.storeId),
              eq(appBindingAssignments.aggregate, "apps"),
              eq(
                appBindingAssignments.aggregateId,
                capabilityRouteKey(
                  slot.capability,
                  slot.operationContract,
                ),
              ),
              eq(appBindingAssignments.domain, slot.capability),
              ne(appBindingAssignments.slotId, slot.id),
            ),
          );
      }
    }
  }
}

export function lifecycleWorkflowId(
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

export function capabilityRouteKey(
  capability: string,
  operation: string,
): string {
  return `${capability}:${operation}`;
}

function mapInstallation(
  row: AppInstallationModel,
): AppInstallationRecord {
  return {
    ...row,
    configuration: Object.freeze({ ...row.configuration }),
  };
}

function mapOperation(
  row: AppLifecycleOperationModel,
): AppLifecycleOperationRecord {
  if (
    row.actorType !== "USER" &&
    row.actorType !== "SERVICE" &&
    row.actorType !== "SYSTEM"
  ) {
    throw new Error(
      `Unsupported App lifecycle actor type "${row.actorType}"`,
    );
  }

  return {
    ...row,
    actorType: row.actorType,
  };
}

function requiredRow<T>(
  row: T | undefined,
  description: string,
): T {
  if (!row) {
    throw new Error(`${description} was not returned by PostgreSQL`);
  }
  return row;
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
