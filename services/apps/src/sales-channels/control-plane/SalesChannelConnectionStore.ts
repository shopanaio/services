import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type {
  SalesChannelConnectionRecord,
  SalesChannelConnectionStatus,
  SalesChannelOperationRecord,
  SalesChannelOperationType,
} from "../../control-plane/types.js";
import { Repository } from "../../repositories/Repository.js";

export interface SalesChannelActor {
  readonly type: "USER" | "APP" | "SERVICE" | "SYSTEM";
  readonly id?: string;
}

export interface BegunSalesChannelOperation {
  readonly connection: SalesChannelConnectionRecord;
  readonly operation: SalesChannelOperationRecord;
  readonly duplicate: boolean;
}

@Injectable()
export class SalesChannelConnectionStore {
  constructor(private readonly repository: Repository) {}

  beginConnect(input: {
    readonly installationId: string;
    readonly specificationId: string;
    readonly displayName: string;
    readonly configuration: Readonly<Record<string, unknown>>;
    readonly idempotencyKey: string;
    readonly actor: SalesChannelActor;
    readonly correlationId?: string;
    readonly workflowId?: string;
    readonly trustedStoreId?: string;
  }): Promise<BegunSalesChannelOperation> {
    return this.repository.runInTransaction(async () => {
      const installation = input.trustedStoreId
        ? await this.repository.installation.lockById(input.installationId)
        : await this.repository.installation.lockByIdForStore(
            input.installationId,
          );
      if (!installation || installation.status !== "ACTIVE") {
        throw new Error("Active App installation not found");
      }
      if (
        input.trustedStoreId &&
        installation.storeId !== input.trustedStoreId
      ) {
        throw new Error("App installation does not belong to the store");
      }
      const specification =
        await this.repository.salesChannelSpecification.findById(
          input.specificationId,
        );
      if (
        !specification ||
        specification.installationId !== installation.id ||
        specification.appCode !== installation.appCode
      ) {
        throw new Error(
          "Sales channel specification does not belong to the installation",
        );
      }
      await this.repository.salesChannelConnection.lockCreation(
        installation.id,
        specification.id,
        required(input.idempotencyKey, "idempotencyKey"),
      );
      const duplicate =
        await this.repository.salesChannelOperation.findByInstallationIdempotency(
          installation.id,
          input.idempotencyKey,
        );
      if (duplicate) {
        if (duplicate.type !== "CONNECT") {
          throw new Error(
            `Sales channel idempotency key is already used for ${duplicate.type}`,
          );
        }
        const duplicateConnection =
          await this.repository.salesChannelConnection.findById(
            duplicate.connectionId,
          );
        if (!duplicateConnection) {
          throw new Error("Idempotent sales channel connection not found");
        }
        return {
          connection: duplicateConnection,
          operation: duplicate,
          duplicate: true,
        };
      }
      const connectionPolicy =
        specification.definition.connection &&
        typeof specification.definition.connection === "object"
          ? (specification.definition.connection as Record<string, unknown>)
          : null;
      if (!connectionPolicy) {
        throw new Error("Sales channel specification has no connection policy");
      }
      if (connectionPolicy.allowMultipleConnections !== true) {
        const existing =
          await this.repository.salesChannelConnection.findNonTerminalBySpecification(
            installation.id,
            specification.id,
          );
        if (existing) {
          throw new Error(
            `Sales channel specification "${specification.handle}" allows only one connection`,
          );
        }
      }
      assertNoCredentialFields(input.configuration);
      const draft = await this.repository.salesChannelConnection.create({
        organizationId: installation.organizationId,
        storeId: installation.storeId,
        installationId: installation.id,
        specificationSnapshotId: specification.id,
        displayName: required(input.displayName, "displayName"),
        configuration: input.configuration,
      });
      const connection =
        await this.repository.salesChannelConnection.update(draft.id, {
          status: "CONNECTING",
        });
      if (!connection) {
        throw new Error("Sales channel connection disappeared");
      }
      const operation = await this.repository.salesChannelOperation.create({
        connectionId: connection.id,
        type: "CONNECT",
        idempotencyKey: input.idempotencyKey,
        workflowId:
          input.workflowId ??
          workflowId(
            connection.id,
            "CONNECT",
            input.idempotencyKey,
          ),
        actorType: input.actor.type,
        actorId: input.actor.id,
        correlationId: input.correlationId,
        previousConnectionStatus: "DRAFT",
      });
      return { connection, operation, duplicate: false };
    });
  }

  beginOperation(input: {
    readonly connectionId: string;
    readonly type: SalesChannelOperationType;
    readonly expectedStatuses: readonly SalesChannelConnectionStatus[];
    readonly transitionStatus: SalesChannelConnectionStatus;
    readonly idempotencyKey: string;
    readonly actor: SalesChannelActor;
    readonly correlationId?: string;
    readonly expectedConfigurationVersion?: number;
    readonly targetSpecificationId?: string;
    readonly trustedStoreId?: string;
  }): Promise<BegunSalesChannelOperation> {
    return this.repository.runInTransaction(async () => {
      const connection = input.trustedStoreId
        ? await this.repository.salesChannelConnection.lockById(
            input.connectionId,
          )
        : await this.repository.salesChannelConnection.lockByIdForStore(
            input.connectionId,
          );
      if (!connection) throw new Error("Sales channel connection not found");
      if (
        input.trustedStoreId &&
        connection.storeId !== input.trustedStoreId
      ) {
        throw new Error("Sales channel connection does not belong to the store");
      }
      const duplicate =
        await this.repository.salesChannelOperation.findByIdempotency(
          connection.id,
          required(input.idempotencyKey, "idempotencyKey"),
        );
      if (duplicate) {
        if (duplicate.type !== input.type) {
          throw new Error(
            `Sales channel idempotency key is already used for ${duplicate.type}`,
          );
        }
        return { connection, operation: duplicate, duplicate: true };
      }
      if (!input.expectedStatuses.includes(connection.status)) {
        throw new Error(
          `Cannot ${input.type.toLowerCase()} sales channel connection from status "${connection.status}"`,
        );
      }
      if (
        input.expectedConfigurationVersion !== undefined &&
        connection.configurationVersion !==
          input.expectedConfigurationVersion
      ) {
        throw new Error(
          `Sales channel configuration version conflict: expected ${input.expectedConfigurationVersion}, received ${connection.configurationVersion}`,
        );
      }
      if (input.type === "UPDATE") {
        assertNoCredentialFields(
          input as unknown as Readonly<Record<string, unknown>>,
        );
      }
      const installation =
        await this.repository.installation.findById(connection.installationId);
      if (
        !installation ||
        (installation.status !== "ACTIVE" &&
          !(input.type === "UPDATE" &&
            installation.status === "UPDATING") &&
          !(input.type === "DISCONNECT" &&
            installation.status === "UNINSTALLING"))
      ) {
        throw new Error(
          "Sales channel operation requires an active App installation",
        );
      }
      if (input.targetSpecificationId) {
        const target =
          await this.repository.salesChannelSpecification.findById(
            input.targetSpecificationId,
          );
        if (!target || target.installationId !== connection.installationId) {
          throw new Error("Target sales channel specification is invalid");
        }
      }
      const transitioned =
        await this.repository.salesChannelConnection.update(connection.id, {
          status: input.transitionStatus,
          lastErrorCode: null,
          lastErrorMessage: null,
        });
      if (!transitioned) {
        throw new Error("Sales channel connection disappeared");
      }
      const operation =
        await this.repository.salesChannelOperation.create({
          connectionId: connection.id,
          type: input.type,
          targetSpecificationId: input.targetSpecificationId,
          idempotencyKey: input.idempotencyKey,
          workflowId: workflowId(
            connection.id,
            input.type,
            input.idempotencyKey,
          ),
          actorType: input.actor.type,
          actorId: input.actor.id,
          correlationId: input.correlationId,
          previousConnectionStatus: connection.status,
        });
      return { connection: transitioned, operation, duplicate: false };
    });
  }

  findById(id: string): Promise<SalesChannelConnectionRecord | null> {
    return this.repository.salesChannelConnection.findById(id);
  }

  findByIdForStore(
    id: string,
  ): Promise<SalesChannelConnectionRecord | null> {
    return this.repository.salesChannelConnection.findByIdForStore(id);
  }

  findOperation(id: string): Promise<SalesChannelOperationRecord | null> {
    return this.repository.salesChannelOperation.findById(id);
  }

  findInstallation(id: string) {
    return this.repository.installation.findById(id);
  }

  listByInstallation(
    installationId: string,
    includeDisconnected = true,
  ): Promise<SalesChannelConnectionRecord[]> {
    return this.repository.salesChannelConnection.listByInstallation(
      installationId,
      includeDisconnected,
    );
  }

  markRunning(operationId: string): Promise<void> {
    return this.setOperationStatus(operationId, "RUNNING");
  }

  complete(
    operationId: string,
    result?: {
      readonly externalAccountId?: string;
      readonly externalAccountLabel?: string;
      readonly configuration?: Readonly<Record<string, unknown>>;
      readonly displayName?: string;
    },
  ): Promise<SalesChannelConnectionRecord> {
    return this.repository.runInTransaction(async () => {
      const operation =
        await this.repository.salesChannelOperation.findById(operationId);
      if (!operation) throw new Error("Sales channel operation not found");
      const connection =
        await this.repository.salesChannelConnection.lockById(
          operation.connectionId,
        );
      if (!connection) throw new Error("Sales channel connection not found");
      const now = new Date().toISOString();
      const nextStatus =
        operation.type === "SUSPEND"
          ? "SUSPENDED"
          : operation.type === "DISCONNECT"
            ? "DISCONNECTED"
            : "ACTIVE";
      const specification =
        await this.repository.salesChannelSpecification.findById(
          operation.targetSpecificationId ??
            connection.specificationSnapshotId,
        );
      const requiresExternalAccount =
        specification?.definition.connection &&
        typeof specification.definition.connection === "object" &&
        (specification.definition.connection as Record<string, unknown>)
          .requiresExternalAccount === true;
      if (
        operation.type === "CONNECT" &&
        requiresExternalAccount &&
        !result?.externalAccountId?.trim()
      ) {
        throw new Error(
          "Sales channel connection requires an external account identity",
        );
      }
      const updated =
        await this.repository.salesChannelConnection.update(connection.id, {
          status: nextStatus,
          displayName: result?.displayName ?? connection.displayName,
          externalAccountId:
            result?.externalAccountId ?? connection.externalAccountId,
          externalAccountLabel:
            result?.externalAccountLabel ?? connection.externalAccountLabel,
          configuration:
            result?.configuration ?? connection.configuration,
          configurationVersion:
            result?.configuration === undefined
              ? connection.configurationVersion
              : connection.configurationVersion + 1,
          specificationSnapshotId:
            operation.targetSpecificationId ??
            connection.specificationSnapshotId,
          connectedAt:
            operation.type === "CONNECT"
              ? now
              : connection.connectedAt,
          suspendedAt:
            operation.type === "SUSPEND"
              ? now
              : operation.type === "RESUME"
                ? null
                : connection.suspendedAt,
          disconnectedAt:
            operation.type === "DISCONNECT"
              ? now
              : connection.disconnectedAt,
          healthStatus:
            operation.type === "CONNECT" || operation.type === "RESUME"
              ? "HEALTHY"
              : connection.healthStatus,
        });
      await this.repository.salesChannelOperation.updateStatus(
        operation.id,
        "SUCCEEDED",
      );
      if (!updated) throw new Error("Sales channel connection disappeared");
      return updated;
    });
  }

  fail(operationId: string, error: unknown): Promise<void> {
    return this.repository.runInTransaction(async () => {
      const operation =
        await this.repository.salesChannelOperation.findById(operationId);
      if (!operation || operation.status === "SUCCEEDED") return;
      const failureStatus =
        operation.type === "CONNECT"
          ? "CONNECT_FAILED"
          : operation.type === "UPDATE"
            ? "UPDATE_FAILED"
            : operation.type === "DISCONNECT"
              ? "DISCONNECT_FAILED"
              : operation.previousConnectionStatus ?? "ACTIVE";
      const normalized = normalizeError(error);
      await this.repository.salesChannelConnection.update(
        operation.connectionId,
        {
          status: failureStatus,
          lastErrorCode: normalized.code,
          lastErrorMessage: normalized.message,
          healthStatus: "UNHEALTHY",
        },
      );
      await this.repository.salesChannelOperation.updateStatus(
        operation.id,
        "FAILED",
        normalized,
      );
    });
  }

  async listNonTerminalForInstallation(
    installationId: string,
  ): Promise<SalesChannelConnectionRecord[]> {
    return this.repository.salesChannelConnection.listByInstallation(
      installationId,
      false,
    );
  }

  private async setOperationStatus(
    operationId: string,
    status: "RUNNING",
  ): Promise<void> {
    const updated =
      await this.repository.salesChannelOperation.updateStatus(
        operationId,
        status,
      );
    if (!updated) throw new Error("Sales channel operation not found");
  }
}

function required(value: string, field: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

const forbiddenCredentialKey =
  /(?:credential|secret|token|api[-_]?key|password|private[-_]?key)/i;

function assertNoCredentialFields(
  value: Readonly<Record<string, unknown>>,
  path: readonly string[] = [],
): void {
  for (const [key, entry] of Object.entries(value)) {
    const nextPath = [...path, key];
    if (forbiddenCredentialKey.test(key)) {
      throw new Error(
        `Sales channel configuration cannot contain credential field "${nextPath.join(".")}"`,
      );
    }
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      assertNoCredentialFields(
        entry as Readonly<Record<string, unknown>>,
        nextPath,
      );
    }
  }
}

function workflowId(
  connectionId: string,
  type: SalesChannelOperationType,
  idempotencyKey: string,
): string {
  const hash = createHash("sha256")
    .update(idempotencyKey)
    .digest("hex")
    .slice(0, 16);
  return `apps:sales-channel:${connectionId}:${type}:${hash}`;
}

function normalizeError(error: unknown) {
  return error instanceof Error
    ? { code: error.name || "SALES_CHANNEL_ERROR", message: error.message }
    : { code: "SALES_CHANNEL_ERROR", message: String(error) };
}
