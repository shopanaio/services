import {
  and,
  desc,
  eq,
  getTableColumns,
  inArray,
} from "drizzle-orm";
import type { AppManifest } from "@shopana/app-sdk";
import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { AppManifestSnapshot } from "../../control-plane/types.js";
import type { Database } from "../../infrastructure/db/database.js";
import { BaseRepository } from "../BaseRepository.js";
import {
  appInstallationManifestSnapshots,
  appInstallations,
} from "../models/index.js";

export const appManifestSnapshotRelayQuery = createRelayQuery(
  createQuery(appInstallationManifestSnapshots)
    .include(["id"])
    .maxLimit(100)
    .defaultLimit(20),
  { name: "appManifestSnapshot", tieBreaker: "id" },
);

export type AppManifestSnapshotRelayInput = InferRelayInput<
  typeof appManifestSnapshotRelayQuery
>;

export interface AppManifestSnapshotConnectionInput {
  readonly first?: number | null;
  readonly after?: string | null;
  readonly last?: number | null;
  readonly before?: string | null;
}

export interface AppManifestSnapshotConnectionResult {
  readonly edges: Array<{ cursor: string; nodeId: string }>;
  readonly pageInfo: PageInfo;
  readonly totalCount: number;
}

export interface AppManifestSnapshotRecord {
  readonly id: string;
  readonly installationId: string;
  readonly appCode: string;
  readonly version: string;
  readonly manifestHash: string;
  readonly manifest: AppManifest;
  readonly createdAt: string;
}

export class AppManifestSnapshotRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
  ) {
    super(db, txManager);
  }

  async save(
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

  async find(
    installationId: string,
    version: string,
    manifestHash: string,
  ): Promise<AppManifestSnapshotRecord | null> {
    const rows = await this.connection
      .select()
      .from(appInstallationManifestSnapshots)
      .where(
        and(
          eq(
            appInstallationManifestSnapshots.installationId,
            installationId,
          ),
          eq(appInstallationManifestSnapshots.version, version),
          eq(
            appInstallationManifestSnapshots.manifestHash,
            manifestHash,
          ),
        ),
      )
      .limit(1);
    return rows[0] ? mapSnapshot(rows[0]) : null;
  }

  async findByIdForStore(
    id: string,
  ): Promise<AppManifestSnapshotRecord | null> {
    const rows = await this.connection
      .select(getTableColumns(appInstallationManifestSnapshots))
      .from(appInstallationManifestSnapshots)
      .innerJoin(
        appInstallations,
        eq(
          appInstallations.id,
          appInstallationManifestSnapshots.installationId,
        ),
      )
      .where(
        and(
          eq(appInstallations.storeId, this.storeId),
          eq(appInstallationManifestSnapshots.id, id),
        ),
      )
      .limit(1);
    return rows[0] ? mapSnapshot(rows[0]) : null;
  }

  async getByIdsForStore(
    ids: readonly string[],
  ): Promise<AppManifestSnapshotRecord[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.connection
      .select(getTableColumns(appInstallationManifestSnapshots))
      .from(appInstallationManifestSnapshots)
      .innerJoin(
        appInstallations,
        eq(
          appInstallations.id,
          appInstallationManifestSnapshots.installationId,
        ),
      )
      .where(
        and(
          eq(appInstallations.storeId, this.storeId),
          inArray(
            appInstallationManifestSnapshots.id,
            [...new Set(ids)],
          ),
        ),
      );
    return rows.map(mapSnapshot);
  }

  async findLatest(
    installationId: string,
  ): Promise<AppManifestSnapshotRecord | null> {
    const rows = await this.connection
      .select()
      .from(appInstallationManifestSnapshots)
      .where(
        eq(
          appInstallationManifestSnapshots.installationId,
          installationId,
        ),
      )
      .orderBy(desc(appInstallationManifestSnapshots.createdAt))
      .limit(1);
    return rows[0] ? mapSnapshot(rows[0]) : null;
  }

  async listByInstallation(
    installationId: string,
  ): Promise<AppManifestSnapshotRecord[]> {
    const rows = await this.connection
      .select()
      .from(appInstallationManifestSnapshots)
      .where(
        eq(
          appInstallationManifestSnapshots.installationId,
          installationId,
        ),
      )
      .orderBy(desc(appInstallationManifestSnapshots.createdAt));
    return rows.map(mapSnapshot);
  }

  async getConnection(
    installationId: string,
    input: AppManifestSnapshotConnectionInput,
  ): Promise<AppManifestSnapshotConnectionResult> {
    if (!(await this.installationBelongsToCurrentStore(installationId))) {
      return emptyConnection();
    }

    const where: AppManifestSnapshotRelayInput["where"] = {
      installationId: { _eq: installationId },
    };
    const relayInput: AppManifestSnapshotRelayInput = {
      first:
        input.first == null && input.last == null
          ? 20
          : input.first,
      after: input.after,
      last: input.last,
      before: input.before,
      where,
      orderBy: [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };

    const [result, totalCount] = await Promise.all([
      appManifestSnapshotRelayQuery.execute(
        this.connection,
        relayInput,
      ),
      appManifestSnapshotRelayQuery.count(this.connection, {
        where,
      }),
    ]);

    return {
      edges: result.edges.map(({ cursor, node }) => ({
        cursor,
        nodeId: node.id,
      })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  private async installationBelongsToCurrentStore(
    installationId: string,
  ): Promise<boolean> {
    const rows = await this.connection
      .select({ id: appInstallations.id })
      .from(appInstallations)
      .where(
        and(
          eq(appInstallations.storeId, this.storeId),
          eq(appInstallations.id, installationId),
        ),
      )
      .limit(1);
    return rows.length === 1;
  }
}

function emptyConnection(): AppManifestSnapshotConnectionResult {
  return {
    edges: [],
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
    totalCount: 0,
  };
}

function mapSnapshot(
  row: typeof appInstallationManifestSnapshots.$inferSelect,
): AppManifestSnapshotRecord {
  return {
    ...row,
    manifest: row.manifest as AppManifest,
  };
}
