import {
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { ShopanaAppDefinition } from "@shopana/app-sdk";
import type {
  AppInstallationRecord,
  SalesChannelConnectionRecord,
  SalesChannelOperationRecord,
  SalesChannelSpecificationSnapshotRecord,
} from "../../control-plane/types.js";
import { AppsType } from "./AppsType.js";

export class AppDefinitionResolver extends AppsType<ShopanaAppDefinition> {
  code() { return this.$props.manifest.code; }
  version() { return this.$props.manifest.version; }
  displayName() { return this.$props.manifest.displayName; }
  description() { return this.$props.manifest.description; }
  runtimeStatus() {
    return this.$ctx.runtimes.get(this.$props.manifest.code)?.status ?? "STOPPED";
  }
  async runtimeHealth() {
    const value = await this.$ctx.runtimes.health(this.$props.manifest.code);
    return { ...value, status: value.status.toUpperCase() };
  }
  permissions() {
    return this.$props.manifest.permissions.map((scope) => ({
      scope,
      granted: false,
    }));
  }
  capabilities() {
    return this.$props.manifest.capabilities.map((capability) => ({
      key: capability.key,
      operations: Object.entries(capability.operations).map(
        ([name, action]) => ({ name, action }),
      ),
    }));
  }
  graphql() { return this.$props.manifest.graphql; }
  async installed() {
    return Boolean(
      await this.$ctx.repository.installation.findNonTerminalByAppForStore(
        this.$props.manifest.code,
      ),
    );
  }
  async installation() {
    const row =
      await this.$ctx.repository.installation.findNonTerminalByAppForStore(
        this.$props.manifest.code,
      );
    return row ? new AppInstallationResolver(row, this.$ctx) : null;
  }
  async salesChannelSpecifications() {
    if (this.$props.manifest.schemaVersion !== 2) return [];
    const installation =
      await this.$ctx.repository.installation.findNonTerminalByAppForStore(
        this.$props.manifest.code,
      );
    const snapshots = installation
      ? await this.$ctx.repository.salesChannelSpecification.listByInstallation(
          installation.id,
          this.$props.manifest.version,
        )
      : [];
    const byHandle = new Map(snapshots.map((item) => [item.handle, item]));
    return (
      this.$props.manifest.extensions.salesChannels?.specifications ?? []
    ).map((definition) => ({
      id: byHandle.has(definition.handle)
        ? this.encodeId(
            byHandle.get(definition.handle)!.id,
            GlobalIdEntity.SalesChannelSpecification,
          )
        : null,
      handle: definition.handle,
      label: definition.label,
      definition,
    }));
  }
}

export class AppInstallationResolver extends AppsType<AppInstallationRecord> {
  id() { return this.encodeId(this.$props.id, GlobalIdEntity.AppInstallation); }
  appCode() { return this.$props.appCode; }
  status() { return this.$props.status; }
  installedVersion() { return this.$props.installedVersion; }
  targetVersion() { return this.$props.targetVersion; }
  manifestHash() { return this.$props.manifestHash; }
  configuration() { return this.$props.configuration; }
  configurationVersion() { return this.$props.configurationVersion; }
  healthStatus() { return this.$props.healthStatus; }
  lastError() {
    return this.$props.lastErrorMessage
      ? {
          code: this.$props.lastErrorCode ?? "APP_ERROR",
          message: this.$props.lastErrorMessage,
        }
      : null;
  }
  installedByUserId() { return this.$props.installedByUserId; }
  installedAt() { return this.$props.installedAt; }
  suspendedAt() { return this.$props.suspendedAt; }
  uninstalledAt() { return this.$props.uninstalledAt; }
  createdAt() { return this.$props.createdAt; }
  updatedAt() { return this.$props.updatedAt; }
  scopes() { return []; }
  capabilities() { return []; }
  lifecycleOperations() { return emptyConnection(); }
  manifestSnapshots() { return emptyConnection(); }
  salesChannelConnections(args: PaginationArgs) {
    return new SalesChannelConnectionConnectionResolver(
      { ...args, installationId: this.$props.id },
      this.$ctx,
    );
  }
}

export class SalesChannelSpecificationResolver extends AppsType<
  SalesChannelSpecificationSnapshotRecord
> {
  id() {
    return this.encodeId(
      this.$props.id,
      GlobalIdEntity.SalesChannelSpecification,
    );
  }
  appCode() { return this.$props.appCode; }
  appVersion() { return this.$props.appVersion; }
  handle() { return this.$props.handle; }
  label() { return this.$props.label; }
  definition() { return this.$props.definition; }
  createdAt() { return this.$props.createdAt; }
}

export class SalesChannelConnectionResolver extends AppsType<
  SalesChannelConnectionRecord
> {
  id() {
    return this.encodeId(
      this.$props.id,
      GlobalIdEntity.SalesChannelConnection,
    );
  }
  async installation() {
    const row =
      await this.$ctx.repository.installation.findByIdForStore(
        this.$props.installationId,
      );
    return row ? new AppInstallationResolver(row, this.$ctx) : null;
  }
  async specification() {
    const row =
      await this.$ctx.repository.salesChannelSpecification.findById(
        this.$props.specificationSnapshotId,
      );
    return row ? new SalesChannelSpecificationResolver(row, this.$ctx) : null;
  }
  displayName() { return this.$props.displayName; }
  externalAccountId() { return this.$props.externalAccountId; }
  externalAccountLabel() { return this.$props.externalAccountLabel; }
  status() { return this.$props.status; }
  async effectiveActive() {
    if (this.$props.status !== "ACTIVE") return false;
    const installation =
      await this.$ctx.repository.installation.findByIdForStore(
        this.$props.installationId,
      );
    return installation?.status === "ACTIVE";
  }
  configuration() { return this.$props.configuration; }
  configurationVersion() { return this.$props.configurationVersion; }
  healthStatus() { return this.$props.healthStatus; }
  lastError() {
    return this.$props.lastErrorMessage
      ? {
          code: this.$props.lastErrorCode ?? "SALES_CHANNEL_ERROR",
          message: this.$props.lastErrorMessage,
        }
      : null;
  }
  createdAt() { return this.$props.createdAt; }
  updatedAt() { return this.$props.updatedAt; }
  connectedAt() { return this.$props.connectedAt; }
  suspendedAt() { return this.$props.suspendedAt; }
  disconnectedAt() { return this.$props.disconnectedAt; }
}

export class SalesChannelOperationResolver extends AppsType<
  SalesChannelOperationRecord
> {
  id() {
    return this.encodeId(this.$props.id, GlobalIdEntity.SalesChannelOperation);
  }
  async connection() {
    const row =
      await this.$ctx.repository.salesChannelConnection.findByIdForStore(
        this.$props.connectionId,
      );
    return row ? new SalesChannelConnectionResolver(row, this.$ctx) : null;
  }
  type() { return this.$props.type; }
  status() { return this.$props.status; }
  workflowId() { return this.$props.workflowId; }
  error() {
    return this.$props.errorMessage
      ? {
          code: this.$props.errorCode ?? "SALES_CHANNEL_ERROR",
          message: this.$props.errorMessage,
        }
      : null;
  }
  startedAt() { return this.$props.startedAt; }
  completedAt() { return this.$props.completedAt; }
  createdAt() { return this.$props.createdAt; }
  updatedAt() { return this.$props.updatedAt; }
}

interface PaginationArgs {
  readonly first?: number | null;
  readonly after?: string | null;
  readonly last?: number | null;
  readonly before?: string | null;
}

export class SalesChannelConnectionConnectionResolver extends AppsType<
  PaginationArgs & { readonly installationId?: string }
> {
  private async rows() {
    const rows = this.$props.installationId
      ? await this.$ctx.repository.salesChannelConnection.listByInstallation(
          this.$props.installationId,
        )
      : await this.$ctx.repository.salesChannelConnection.listForCurrentStore();
    const limit = Math.max(
      1,
      Math.min(100, this.$props.first ?? this.$props.last ?? 20),
    );
    return this.$props.last ? rows.slice(-limit) : rows.slice(0, limit);
  }
  async edges() {
    const rows = await this.rows();
    return rows.map((row, index) => ({
      cursor: Buffer.from(`${index}:${row.id}`).toString("base64url"),
      node: new SalesChannelConnectionResolver(row, this.$ctx),
    }));
  }
  async totalCount() {
    return this.$props.installationId
      ? (
          await this.$ctx.repository.salesChannelConnection.listByInstallation(
            this.$props.installationId,
          )
        ).length
      : (
          await this.$ctx.repository.salesChannelConnection.listForCurrentStore()
        ).length;
  }
  async pageInfo() {
    const edges = await this.edges();
    return {
      hasNextPage: (await this.totalCount()) > edges.length,
      hasPreviousPage: false,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges.at(-1)?.cursor ?? null,
    };
  }
}

function emptyConnection() {
  return {
    edges: [],
    totalCount: 0,
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
  };
}
