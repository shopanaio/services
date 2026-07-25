import DataLoader from "dataloader";
import type {
  AppInstallationRecord,
  AppLifecycleOperationRecord,
  SalesChannelConnectionRecord,
  SalesChannelOperationRecord,
  SalesChannelSpecificationSnapshotRecord,
} from "../control-plane/types.js";
import type { AppCapabilityBindingRecord } from "../repositories/capability/AppCapabilityRepository.js";
import type { AppManifestSnapshotRecord } from "../repositories/manifest/AppManifestSnapshotRepository.js";
import type { Repository } from "../repositories/Repository.js";
import type { AppInstallationScopeRecord } from "../repositories/scope/AppInstallationScopeRepository.js";

function createEntityLoader<T extends { readonly id: string }>(
  loadMany: (ids: readonly string[]) => Promise<readonly T[]>,
): DataLoader<string, T | null> {
  return new DataLoader<string, T | null>(async (ids) => {
    const rows = await loadMany(ids);
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.map((id) => byId.get(id) ?? null);
  });
}

function createRelationLoader<T>(
  loadMany: (ids: readonly string[]) => Promise<readonly T[]>,
  getParentId: (row: T) => string,
): DataLoader<string, readonly T[]> {
  return new DataLoader<string, readonly T[]>(async (ids) => {
    const rows = await loadMany(ids);
    const grouped = new Map<string, T[]>();
    for (const row of rows) {
      const parentId = getParentId(row);
      const values = grouped.get(parentId);
      if (values) values.push(row);
      else grouped.set(parentId, [row]);
    }
    return ids.map((id) => grouped.get(id) ?? []);
  });
}

/**
 * Request-scoped entity loaders for the Apps admin control plane.
 *
 * Every batch method is store-scoped. A loader instance must never be shared
 * between GraphQL requests.
 */
export class Loader {
  readonly installation: DataLoader<string, AppInstallationRecord | null>;
  readonly installationByAppCode: DataLoader<
    string,
    AppInstallationRecord | null
  >;
  readonly lifecycleOperation: DataLoader<
    string,
    AppLifecycleOperationRecord | null
  >;
  readonly manifestSnapshot: DataLoader<
    string,
    AppManifestSnapshotRecord | null
  >;
  readonly capabilityBinding: DataLoader<
    string,
    AppCapabilityBindingRecord | null
  >;
  readonly salesChannelSpecification: DataLoader<
    string,
    SalesChannelSpecificationSnapshotRecord | null
  >;
  readonly salesChannelConnection: DataLoader<
    string,
    SalesChannelConnectionRecord | null
  >;
  readonly salesChannelOperation: DataLoader<
    string,
    SalesChannelOperationRecord | null
  >;
  readonly scopesByInstallation: DataLoader<
    string,
    readonly AppInstallationScopeRecord[]
  >;
  readonly capabilityBindingsByInstallation: DataLoader<
    string,
    readonly AppCapabilityBindingRecord[]
  >;
  readonly salesChannelConnectionsByInstallation: DataLoader<
    string,
    readonly SalesChannelConnectionRecord[]
  >;

  constructor(repository: Repository) {
    this.installation = createEntityLoader((ids) =>
      repository.installation.getByIdsForStore(ids),
    );
    this.installationByAppCode = new DataLoader<
      string,
      AppInstallationRecord | null
    >(async (appCodes) => {
      const rows =
        await repository.installation.getNonTerminalByAppCodesForStore(
          appCodes,
        );
      const byAppCode = new Map(rows.map((row) => [row.appCode, row]));
      return appCodes.map((appCode) => byAppCode.get(appCode) ?? null);
    });
    this.lifecycleOperation = createEntityLoader((ids) =>
      repository.lifecycleOperation.getByIdsForStore(ids),
    );
    this.manifestSnapshot = createEntityLoader((ids) =>
      repository.manifestSnapshot.getByIdsForStore(ids),
    );
    this.capabilityBinding = createEntityLoader((ids) =>
      repository.capability.getByIdsForStore(ids),
    );
    this.salesChannelSpecification = createEntityLoader((ids) =>
      repository.salesChannelSpecification.getByIdsForStore(ids),
    );
    this.salesChannelConnection = createEntityLoader((ids) =>
      repository.salesChannelConnection.getByIdsForStore(ids),
    );
    this.salesChannelOperation = createEntityLoader((ids) =>
      repository.salesChannelOperation.getByIdsForStore(ids),
    );
    this.scopesByInstallation = createRelationLoader(
      (ids) => repository.scope.listByInstallationIdsForStore(ids),
      (row) => row.installationId,
    );
    this.capabilityBindingsByInstallation = createRelationLoader(
      (ids) => repository.capability.listByInstallationIdsForStore(ids),
      (row) => row.installationId,
    );
    this.salesChannelConnectionsByInstallation = createRelationLoader(
      (ids) =>
        repository.salesChannelConnection.listByInstallationIdsForStore(
          ids,
        ),
      (row) => row.installationId,
    );
  }
}
