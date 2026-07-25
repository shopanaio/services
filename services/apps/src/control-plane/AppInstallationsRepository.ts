import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type {
  AppInstallationStatus,
  AppLifecycleOperationType,
  AppManifest,
} from "@shopana/app-sdk";
import type { Knex } from "knex";
import { knexInstance } from "../infrastructure/db/database.js";
import type {
  AppInstallationRecord,
  AppLifecycleOperationRecord,
  AppManifestSnapshot,
  ResolvedCapabilityRoute,
} from "./types.js";
import { snapshotManifest } from "./manifest.js";

type DatabaseRow = Record<string, unknown>;

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

@Injectable()
export class AppInstallationsRepository {
  constructor(private readonly database: Knex = knexInstance) {}

  async beginInstall(
    input: BeginInstallInput,
  ): Promise<BegunLifecycleOperation> {
    return this.database.transaction(async (trx) => {
      const current = await trx("platform.app_installations")
        .where({
          store_id: input.storeId,
          app_code: input.appCode,
        })
        .whereNot({ status: "UNINSTALLED" })
        .forUpdate()
        .first();

      if (current) {
        const duplicate = await this.findOperationByIdempotency(
          trx,
          String(current.id),
          input.idempotencyKey,
        );
        if (duplicate) {
          return {
            installation: mapInstallation(current),
            operation: duplicate,
            duplicate: true,
          };
        }
        if (current.status === "INSTALL_FAILED") {
          const [installationRow] = await trx(
            "platform.app_installations",
          )
            .where({ id: current.id })
            .update({
              status: "INSTALLING",
              target_version: input.targetVersion,
              configuration: JSON.stringify(input.configuration),
              configuration_version:
                Number(current.configuration_version) + 1,
              installed_by_user_id:
                input.installedByUserId ??
                current.installed_by_user_id,
              last_error_code: null,
              last_error_message: null,
              updated_at: this.database.fn.now(),
            })
            .returning("*");
          const installationId = String(current.id);
          await this.replaceScopes(
            trx,
            installationId,
            input.grantedScopes,
          );
          await this.saveSnapshot(
            trx,
            installationId,
            input.snapshot,
          );
          const workflowId = lifecycleWorkflowId(
            installationId,
            "INSTALL",
            input.targetVersion,
            input.idempotencyKey,
          );
          const [operationRow] = await trx(
            "platform.app_lifecycle_operations",
          )
            .insert({
              installation_id: installationId,
              type: "INSTALL",
              status: "PENDING",
              target_version: input.targetVersion,
              previous_installation_status: "INSTALL_FAILED",
              idempotency_key: input.idempotencyKey,
              workflow_id: workflowId,
              actor_type: input.actor.type,
              actor_id: input.actor.id ?? null,
              correlation_id: input.correlationId ?? null,
            })
            .returning("*");
          return {
            installation: mapInstallation(installationRow),
            operation: mapOperation(operationRow),
            duplicate: false,
          };
        }
        throw new Error(
          `App "${input.appCode}" already has a non-terminal installation for store "${input.storeId}"`,
        );
      }

      const [installationRow] = await trx("platform.app_installations")
        .insert({
          app_code: input.appCode,
          organization_id: input.organizationId,
          store_id: input.storeId,
          status: "INSTALLING",
          target_version: input.targetVersion,
          configuration: JSON.stringify(input.configuration),
          configuration_version: 1,
          installed_by_user_id: input.installedByUserId ?? null,
        })
        .returning("*");

      const installationId = String(installationRow.id);
      await this.replaceScopes(trx, installationId, input.grantedScopes);
      await this.saveSnapshot(trx, installationId, input.snapshot);

      const workflowId = lifecycleWorkflowId(
        installationId,
        "INSTALL",
        input.targetVersion,
        input.idempotencyKey,
      );
      const [operationRow] = await trx("platform.app_lifecycle_operations")
        .insert({
          installation_id: installationId,
          type: "INSTALL",
          status: "PENDING",
          target_version: input.targetVersion,
          previous_installation_status: "PENDING_CONSENT",
          idempotency_key: input.idempotencyKey,
          workflow_id: workflowId,
          actor_type: input.actor.type,
          actor_id: input.actor.id ?? null,
          correlation_id: input.correlationId ?? null,
        })
        .returning("*");

      return {
        installation: mapInstallation(installationRow),
        operation: mapOperation(operationRow),
        duplicate: false,
      };
    });
  }

  async beginExistingOperation(
    input: BeginExistingOperationInput,
  ): Promise<BegunLifecycleOperation> {
    return this.database.transaction(async (trx) => {
      const row = await trx("platform.app_installations")
        .where({ id: input.installationId })
        .forUpdate()
        .first();
      if (!row) {
        throw new Error(`App installation "${input.installationId}" not found`);
      }

      const duplicate = await this.findOperationByIdempotency(
        trx,
        input.installationId,
        input.idempotencyKey,
      );
      if (duplicate) {
        return {
          installation: mapInstallation(row),
          operation: duplicate,
          duplicate: true,
        };
      }

      const status = String(row.status) as AppInstallationStatus;
      if (!input.expectedStatuses.includes(status)) {
        throw new Error(
          `Cannot ${input.type.toLowerCase()} App installation "${input.installationId}" from status "${status}"`,
        );
      }
      if (
        input.expectedConfigurationVersion !== undefined &&
        Number(row.configuration_version) !==
          input.expectedConfigurationVersion
      ) {
        throw new Error(
          `App installation configuration version conflict: expected ${input.expectedConfigurationVersion}, received ${row.configuration_version}`,
        );
      }

      let previousInstallationStatus = status;
      if (input.type === "UPDATE" && status === "UPDATE_FAILED") {
        const previousAttempt = await trx(
          "platform.app_lifecycle_operations",
        )
          .select("previous_installation_status")
          .where({
            installation_id: input.installationId,
            type: "UPDATE",
            status: "FAILED",
          })
          .whereIn("previous_installation_status", [
            "ACTIVE",
            "SUSPENDED",
          ])
          .orderBy("created_at", "desc")
          .first();
        if (previousAttempt?.previous_installation_status) {
          previousInstallationStatus = String(
            previousAttempt.previous_installation_status,
          ) as AppInstallationStatus;
        }
      }

      const update: DatabaseRow = {
        status: input.transitionStatus,
        target_version: input.targetVersion,
        last_error_code: null,
        last_error_message: null,
        updated_at: this.database.fn.now(),
      };
      if (input.configuration !== undefined) {
        update.configuration = JSON.stringify(input.configuration);
        update.configuration_version =
          Number(row.configuration_version) + 1;
      }
      const [installationRow] = await trx("platform.app_installations")
        .where({ id: input.installationId })
        .update(update)
        .returning("*");

      if (input.grantedScopes) {
        await this.replaceScopes(
          trx,
          input.installationId,
          input.grantedScopes,
        );
      }
      if (input.snapshot) {
        await this.saveSnapshot(trx, input.installationId, input.snapshot);
      }

      const workflowId = lifecycleWorkflowId(
        input.installationId,
        input.type,
        input.targetVersion,
        input.idempotencyKey,
      );
      const [operationRow] = await trx("platform.app_lifecycle_operations")
        .insert({
          installation_id: input.installationId,
          type: input.type,
          status: "PENDING",
          target_version: input.targetVersion,
          previous_installation_status: previousInstallationStatus,
          idempotency_key: input.idempotencyKey,
          workflow_id: workflowId,
          actor_type: input.actor.type,
          actor_id: input.actor.id ?? null,
          correlation_id: input.correlationId ?? null,
        })
        .returning("*");

      if (input.type === "SUSPEND" || input.type === "UNINSTALL") {
        await this.setBindingsEnabledWithTransaction(
          trx,
          input.installationId,
          false,
        );
      }
      if (input.type === "UNINSTALL") {
        await trx("platform.app_installation_secrets")
          .where({ installation_id: input.installationId })
          .whereNull("revoked_at")
          .update({
            revoked_at: this.database.fn.now(),
            updated_at: this.database.fn.now(),
          });
      }

      return {
        installation: mapInstallation(installationRow),
        operation: mapOperation(operationRow),
        duplicate: false,
      };
    });
  }

  async findById(
    installationId: string,
  ): Promise<AppInstallationRecord | null> {
    const row = await this.database("platform.app_installations")
      .where({ id: installationId })
      .first();
    return row ? mapInstallation(row) : null;
  }

  async findOperationById(
    operationId: string,
  ): Promise<AppLifecycleOperationRecord | null> {
    const row = await this.database("platform.app_lifecycle_operations")
      .where({ id: operationId })
      .first();
    return row ? mapOperation(row) : null;
  }

  async listGrantedScopes(installationId: string): Promise<readonly string[]> {
    const rows = await this.database("platform.app_installation_scopes")
      .select("scope")
      .where({ installation_id: installationId })
      .whereNull("revoked_at")
      .orderBy("scope");
    return Object.freeze(rows.map((row) => String(row.scope)));
  }

  async markOperationRunning(operationId: string): Promise<void> {
    const updated = await this.database("platform.app_lifecycle_operations")
      .where({ id: operationId, status: "PENDING" })
      .update({
        status: "RUNNING",
        started_at: this.database.fn.now(),
        updated_at: this.database.fn.now(),
      });
    if (updated !== 1) {
      const current = await this.findOperationById(operationId);
      if (current?.status !== "RUNNING") {
        throw new Error(
          `Lifecycle operation "${operationId}" is not pending or running`,
        );
      }
    }
  }

  async completeOperation(
    operationId: string,
    manifest: AppManifest,
  ): Promise<AppInstallationRecord> {
    return this.database.transaction(async (trx) => {
      const operationRow = await trx("platform.app_lifecycle_operations")
        .where({ id: operationId })
        .forUpdate()
        .first();
      if (!operationRow) {
        throw new Error(`Lifecycle operation "${operationId}" not found`);
      }
      if (operationRow.status === "SUCCEEDED") {
        const existing = await trx("platform.app_installations")
          .where({ id: operationRow.installation_id })
          .first();
        return mapInstallation(existing);
      }

      const type = String(
        operationRow.type,
      ) as AppLifecycleOperationType;
      const installationId = String(operationRow.installation_id);
      const targetVersion = String(operationRow.target_version);
      const previousStatus = operationRow.previous_installation_status
        ? (String(
            operationRow.previous_installation_status,
          ) as AppInstallationStatus)
        : null;

      let nextStatus: AppInstallationStatus;
      const update: DatabaseRow = {
        target_version: null,
        last_error_code: null,
        last_error_message: null,
        updated_at: this.database.fn.now(),
      };

      switch (type) {
        case "INSTALL":
          nextStatus = "ACTIVE";
          update.installed_version = targetVersion;
          update.manifest_hash = snapshotManifest(manifest).hash;
          update.installed_at = this.database.fn.now();
          update.health_status = "HEALTHY";
          await this.syncBindingsWithTransaction(
            trx,
            installationId,
            manifest,
          );
          break;
        case "UPDATE":
          nextStatus =
            previousStatus === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
          update.installed_version = targetVersion;
          update.manifest_hash = snapshotManifest(manifest).hash;
          await this.syncBindingsWithTransaction(
            trx,
            installationId,
            manifest,
          );
          if (nextStatus === "SUSPENDED") {
            await this.setBindingsEnabledWithTransaction(
              trx,
              installationId,
              false,
            );
          }
          break;
        case "SUSPEND":
          nextStatus = "SUSPENDED";
          update.suspended_at = this.database.fn.now();
          break;
        case "RESUME":
          nextStatus = "ACTIVE";
          update.suspended_at = null;
          await this.setBindingsEnabledWithTransaction(
            trx,
            installationId,
            true,
          );
          break;
        case "UNINSTALL":
          nextStatus = "UNINSTALLED";
          update.uninstalled_at = this.database.fn.now();
          update.health_status = "UNKNOWN";
          await trx("platform.slots")
            .where({ installation_id: installationId })
            .delete();
          await trx("platform.app_installation_scopes")
            .where({ installation_id: installationId })
            .whereNull("revoked_at")
            .update({ revoked_at: this.database.fn.now() });
          break;
      }
      update.status = nextStatus;

      const [installationRow] = await trx("platform.app_installations")
        .where({ id: installationId })
        .update(update)
        .returning("*");
      await trx("platform.app_lifecycle_operations")
        .where({ id: operationId })
        .update({
          status: "SUCCEEDED",
          completed_at: this.database.fn.now(),
          updated_at: this.database.fn.now(),
        });
      return mapInstallation(installationRow);
    });
  }

  async failOperation(
    operationId: string,
    error: unknown,
  ): Promise<void> {
    await this.database.transaction(async (trx) => {
      const operation = await trx("platform.app_lifecycle_operations")
        .where({ id: operationId })
        .forUpdate()
        .first();
      if (!operation || operation.status === "SUCCEEDED") {
        return;
      }
      const type = String(operation.type) as AppLifecycleOperationType;
      const previousStatus = operation.previous_installation_status
        ? (String(
            operation.previous_installation_status,
          ) as AppInstallationStatus)
        : null;
      const failureStatus: AppInstallationStatus =
        type === "INSTALL"
          ? "INSTALL_FAILED"
          : type === "UPDATE"
            ? "UPDATE_FAILED"
            : type === "UNINSTALL"
              ? "UNINSTALL_FAILED"
              : previousStatus === "SUSPENDED"
                ? "SUSPENDED"
                : "ACTIVE";
      const normalized = normalizeError(error);

      await trx("platform.app_installations")
        .where({ id: operation.installation_id })
        .update({
          status: failureStatus,
          last_error_code: normalized.code,
          last_error_message: normalized.message,
          target_version: null,
          health_status: "UNHEALTHY",
          updated_at: this.database.fn.now(),
        });
      await trx("platform.app_lifecycle_operations")
        .where({ id: operationId })
        .update({
          status: "FAILED",
          error_code: normalized.code,
          error_message: normalized.message,
          completed_at: this.database.fn.now(),
          updated_at: this.database.fn.now(),
        });

      if (type === "SUSPEND" || type === "RESUME") {
        await this.setBindingsEnabledWithTransaction(
          trx,
          String(operation.installation_id),
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
    const row = await this.database
      .select({
        installation_id: "ai.id",
        app_code: "ai.app_code",
        app_version: "ai.installed_version",
        organization_id: "ai.organization_id",
        store_id: "ai.store_id",
        capability: "s.capability",
        operation: "s.operation_contract",
        target_action: "s.target_action",
      })
      .from({ sa: "platform.slot_assignments" })
      .join({ s: "platform.slots" }, "s.id", "sa.slot_id")
      .join(
        { ai: "platform.app_installations" },
        "ai.id",
        "s.installation_id",
      )
      .where({
        "sa.store_id": storeId,
        "sa.aggregate": "apps",
        "sa.aggregate_id": capabilityRouteKey(capability, operation),
        "sa.domain": capability,
        "sa.status": "active",
        "s.status": "active",
        "s.capability": capability,
        "s.operation_contract": operation,
        "ai.status": "ACTIVE",
      })
      .whereNotNull("s.target_app_code")
      .whereNotNull("s.target_action")
      .orderBy("sa.precedence", "asc")
      .orderBy("sa.updated_at", "desc")
      .first();

    if (!row) {
      return null;
    }
    return {
      installationId: String(row.installation_id),
      appCode: String(row.app_code),
      appVersion: String(row.app_version),
      organizationId: String(row.organization_id),
      storeId: String(row.store_id),
      capability: String(row.capability),
      operation: String(row.operation),
      targetAction: String(row.target_action),
    };
  }

  private async findOperationByIdempotency(
    trx: Knex.Transaction,
    installationId: string,
    idempotencyKey: string,
  ): Promise<AppLifecycleOperationRecord | null> {
    const row = await trx("platform.app_lifecycle_operations")
      .where({
        installation_id: installationId,
        idempotency_key: idempotencyKey,
      })
      .first();
    return row ? mapOperation(row) : null;
  }

  private async replaceScopes(
    trx: Knex.Transaction,
    installationId: string,
    scopes: readonly string[],
  ): Promise<void> {
    const normalized = [...new Set(scopes)].sort();
    await trx("platform.app_installation_scopes")
      .where({ installation_id: installationId })
      .whereNotIn("scope", normalized.length > 0 ? normalized : [""])
      .whereNull("revoked_at")
      .update({ revoked_at: this.database.fn.now() });
    for (const scope of normalized) {
      await trx("platform.app_installation_scopes")
        .insert({
          installation_id: installationId,
          scope,
          revoked_at: null,
        })
        .onConflict(["installation_id", "scope"])
        .merge({
          revoked_at: null,
          granted_at: this.database.fn.now(),
        });
    }
  }

  private async saveSnapshot(
    trx: Knex.Transaction,
    installationId: string,
    snapshot: AppManifestSnapshot,
  ): Promise<void> {
    await trx("platform.app_installation_manifest_snapshots")
      .insert({
        installation_id: installationId,
        app_code: snapshot.manifest.code,
        version: snapshot.manifest.version,
        manifest_hash: snapshot.hash,
        manifest: JSON.stringify(snapshot.manifest),
      })
      .onConflict(["installation_id", "version", "manifest_hash"])
      .ignore();
  }

  private async syncBindingsWithTransaction(
    trx: Knex.Transaction,
    installationId: string,
    manifest: AppManifest,
  ): Promise<void> {
    const installation = await trx("platform.app_installations")
      .where({ id: installationId })
      .first();
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
        const current = await trx("platform.slots")
          .where({
            installation_id: installationId,
            capability: capability.key,
            operation_contract: operation,
          })
          .first();
        let slotId: string;
        if (current) {
          slotId = String(current.id);
          await trx("platform.slots").where({ id: slotId }).update({
            status: "active",
            target_app_code: manifest.code,
            target_action: targetAction,
            updated_at: this.database.fn.now(),
          });
        } else {
          const [slot] = await trx("platform.slots")
            .insert({
              store_id: installation.store_id,
              status: "active",
              installation_id: installationId,
              capability: capability.key,
              operation_contract: operation,
              target_app_code: manifest.code,
              target_action: targetAction,
            })
            .returning("id");
          slotId = String(slot.id);
        }

        await trx("platform.slot_assignments")
          .where({
            store_id: installation.store_id,
            aggregate: "apps",
            aggregate_id: routeKey,
            domain: capability.key,
          })
          .whereNot({ slot_id: slotId })
          .update({
            status: "disabled",
            updated_at: this.database.fn.now(),
          });

        const assignment = await trx("platform.slot_assignments")
          .where({
            store_id: installation.store_id,
            aggregate: "apps",
            aggregate_id: routeKey,
            domain: capability.key,
            slot_id: slotId,
          })
          .first();
        if (assignment) {
          await trx("platform.slot_assignments")
            .where({ id: assignment.id })
            .update({
              status: "active",
              precedence: 0,
              updated_at: this.database.fn.now(),
            });
        } else {
          await trx("platform.slot_assignments").insert({
            store_id: installation.store_id,
            aggregate: "apps",
            aggregate_id: routeKey,
            slot_id: slotId,
            domain: capability.key,
            precedence: 0,
            status: "active",
          });
        }
      }
    }

    const existing = await trx("platform.slots")
      .select(["id", "capability", "operation_contract"])
      .where({ installation_id: installationId });
    const obsoleteIds = existing
      .filter(
        (row) =>
          !declaredRoutes.has(
            capabilityRouteKey(
              String(row.capability),
              String(row.operation_contract),
            ),
          ),
      )
      .map((row) => row.id);
    if (obsoleteIds.length > 0) {
      await trx("platform.slots").whereIn("id", obsoleteIds).delete();
    }
  }

  private async setBindingsEnabledWithTransaction(
    trx: Knex.Transaction,
    installationId: string,
    enabled: boolean,
  ): Promise<void> {
    const slots = await trx("platform.slots")
      .select(["id", "store_id", "capability", "operation_contract"])
      .where({ installation_id: installationId });
    await trx("platform.slots")
      .where({ installation_id: installationId })
      .update({
        status: enabled ? "active" : "inactive",
        updated_at: this.database.fn.now(),
      });
    await trx("platform.slot_assignments")
      .whereIn(
        "slot_id",
        slots.map((slot) => slot.id),
      )
      .update({
        status: enabled ? "active" : "disabled",
        updated_at: this.database.fn.now(),
      });

    if (enabled) {
      for (const slot of slots) {
        await trx("platform.slot_assignments")
          .where({
            store_id: slot.store_id,
            aggregate: "apps",
            aggregate_id: capabilityRouteKey(
              String(slot.capability),
              String(slot.operation_contract),
            ),
            domain: slot.capability,
          })
          .whereNot({ slot_id: slot.id })
          .update({
            status: "disabled",
            updated_at: this.database.fn.now(),
          });
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

function mapInstallation(row: DatabaseRow): AppInstallationRecord {
  return {
    id: String(row.id),
    appCode: String(row.app_code),
    organizationId: String(row.organization_id),
    storeId: String(row.store_id),
    status: String(row.status) as AppInstallationStatus,
    installedVersion: optionalString(row.installed_version),
    targetVersion: optionalString(row.target_version),
    manifestHash: optionalString(row.manifest_hash),
    configuration: parseJsonObject(row.configuration),
    configurationVersion: Number(row.configuration_version),
    installedByUserId: optionalString(row.installed_by_user_id),
    healthStatus: String(
      row.health_status,
    ) as AppInstallationRecord["healthStatus"],
    lastErrorCode: optionalString(row.last_error_code),
    lastErrorMessage: optionalString(row.last_error_message),
    installedAt: optionalDateString(row.installed_at),
    suspendedAt: optionalDateString(row.suspended_at),
    uninstalledAt: optionalDateString(row.uninstalled_at),
    createdAt: requiredDateString(row.created_at),
    updatedAt: requiredDateString(row.updated_at),
  };
}

function mapOperation(row: DatabaseRow): AppLifecycleOperationRecord {
  return {
    id: String(row.id),
    installationId: String(row.installation_id),
    type: String(row.type) as AppLifecycleOperationType,
    status: String(
      row.status,
    ) as AppLifecycleOperationRecord["status"],
    targetVersion: String(row.target_version),
    previousInstallationStatus: row.previous_installation_status
      ? (String(
          row.previous_installation_status,
        ) as AppInstallationStatus)
      : null,
    idempotencyKey: String(row.idempotency_key),
    workflowId: String(row.workflow_id),
    actorType: String(
      row.actor_type,
    ) as AppLifecycleOperationRecord["actorType"],
    actorId: optionalString(row.actor_id),
    correlationId: optionalString(row.correlation_id),
    errorCode: optionalString(row.error_code),
    errorMessage: optionalString(row.error_message),
    startedAt: optionalDateString(row.started_at),
    completedAt: optionalDateString(row.completed_at),
    createdAt: requiredDateString(row.created_at),
    updatedAt: requiredDateString(row.updated_at),
  };
}

function optionalString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function requiredDateString(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function optionalDateString(value: unknown): string | null {
  return value === null || value === undefined
    ? null
    : requiredDateString(value);
}

function parseJsonObject(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value === "string") {
    return JSON.parse(value) as Record<string, unknown>;
  }
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return {};
}

function normalizeError(error: unknown): {
  readonly code: string;
  readonly message: string;
} {
  const message =
    error instanceof Error ? error.message : String(error ?? "Unknown error");
  const candidate =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code)
      : "APP_LIFECYCLE_FAILED";
  return {
    code: candidate.replace(/[^A-Z0-9_:-]/gi, "_").slice(0, 128),
    message: message.slice(0, 4_000),
  };
}
