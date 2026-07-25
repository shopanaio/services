import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import type { TransactionManager } from "@shopana/shared-kernel";
import type {
  SalesChannelConnectionRecord,
  SalesChannelConnectionStatus,
  SalesChannelHealthStatus,
} from "../../control-plane/types.js";
import type { Database } from "../../infrastructure/db/database.js";
import { BaseRepository } from "../BaseRepository.js";
import {
  appSalesChannelConnections,
  appInstallations,
  type SalesChannelConnectionModel,
} from "../models/index.js";

export const salesChannelConnectionRelayQuery = createRelayQuery(
  createQuery(appSalesChannelConnections)
    .include(["id"])
    .maxLimit(100)
    .defaultLimit(20),
  { name: "salesChannelConnection", tieBreaker: "id" },
);

export type SalesChannelConnectionRelayInput = InferRelayInput<
  typeof salesChannelConnectionRelayQuery
>;

export interface SalesChannelConnectionConnectionInput {
  readonly first?: number | null;
  readonly after?: string | null;
  readonly last?: number | null;
  readonly before?: string | null;
  readonly installationId?: string;
}

export interface SalesChannelConnectionConnectionResult {
  readonly edges: Array<{ cursor: string; nodeId: string }>;
  readonly pageInfo: PageInfo;
  readonly totalCount: number;
}

export class SalesChannelConnectionRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
  ) {
    super(db, txManager);
  }

  async create(input: {
    readonly organizationId: string;
    readonly storeId: string;
    readonly installationId: string;
    readonly specificationSnapshotId: string;
    readonly displayName: string;
    readonly configuration: Readonly<Record<string, unknown>>;
  }): Promise<SalesChannelConnectionRecord> {
    const rows = await this.connection
      .insert(appSalesChannelConnections)
      .values({ ...input, configuration: { ...input.configuration } })
      .returning();
    return mapConnection(required(rows[0]));
  }

  async lockCreation(
    installationId: string,
    specificationId: string,
    idempotencyKey: string,
  ): Promise<void> {
    await this.connection.execute(sql`
      SELECT pg_advisory_xact_lock(
        hashtextextended(
          ${`${installationId}:${specificationId}:${idempotencyKey}`},
          0
        )
      )
    `);
  }

  async findNonTerminalBySpecification(
    installationId: string,
    specificationSnapshotId: string,
  ): Promise<SalesChannelConnectionRecord | null> {
    const rows = await this.connection
      .select()
      .from(appSalesChannelConnections)
      .where(
        and(
          eq(appSalesChannelConnections.installationId, installationId),
          eq(
            appSalesChannelConnections.specificationSnapshotId,
            specificationSnapshotId,
          ),
          ne(appSalesChannelConnections.status, "DISCONNECTED"),
        ),
      )
      .limit(1);
    return rows[0] ? mapConnection(rows[0]) : null;
  }

  async findById(
    id: string,
  ): Promise<SalesChannelConnectionRecord | null> {
    const rows = await this.connection
      .select()
      .from(appSalesChannelConnections)
      .where(eq(appSalesChannelConnections.id, id))
      .limit(1);
    return rows[0] ? mapConnection(rows[0]) : null;
  }

  async findByIdForStore(
    id: string,
  ): Promise<SalesChannelConnectionRecord | null> {
    return this.findByIdAndStore(id, this.storeId);
  }

  async findByIdAndStore(
    id: string,
    storeId: string,
  ): Promise<SalesChannelConnectionRecord | null> {
    const rows = await this.connection
      .select()
      .from(appSalesChannelConnections)
      .where(
        and(
          eq(appSalesChannelConnections.storeId, storeId),
          eq(appSalesChannelConnections.id, id),
        ),
      )
      .limit(1);
    return rows[0] ? mapConnection(rows[0]) : null;
  }

  async lockById(
    id: string,
  ): Promise<SalesChannelConnectionRecord | null> {
    const rows = await this.connection
      .select()
      .from(appSalesChannelConnections)
      .where(eq(appSalesChannelConnections.id, id))
      .limit(1)
      .for("update");
    return rows[0] ? mapConnection(rows[0]) : null;
  }

  async lockByIdForStore(
    id: string,
  ): Promise<SalesChannelConnectionRecord | null> {
    const rows = await this.connection
      .select()
      .from(appSalesChannelConnections)
      .where(
        and(
          eq(appSalesChannelConnections.storeId, this.storeId),
          eq(appSalesChannelConnections.id, id),
        ),
      )
      .limit(1)
      .for("update");
    return rows[0] ? mapConnection(rows[0]) : null;
  }

  async update(
    id: string,
    input: Partial<{
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
    }>,
  ): Promise<SalesChannelConnectionRecord | null> {
    const rows = await this.connection
      .update(appSalesChannelConnections)
      .set({
        ...input,
        configuration:
          input.configuration === undefined
            ? undefined
            : { ...input.configuration },
        updatedAt: new Date().toISOString(),
      })
      .where(eq(appSalesChannelConnections.id, id))
      .returning();
    return rows[0] ? mapConnection(rows[0]) : null;
  }

  async updateConfiguration(input: {
    readonly id: string;
    readonly expectedVersion: number;
    readonly configuration: Readonly<Record<string, unknown>>;
    readonly displayName?: string;
  }): Promise<SalesChannelConnectionRecord | null> {
    const rows = await this.connection
      .update(appSalesChannelConnections)
      .set({
        configuration: { ...input.configuration },
        configurationVersion: input.expectedVersion + 1,
        displayName: input.displayName,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(appSalesChannelConnections.id, input.id),
          eq(
            appSalesChannelConnections.configurationVersion,
            input.expectedVersion,
          ),
        ),
      )
      .returning();
    return rows[0] ? mapConnection(rows[0]) : null;
  }

  async listByStore(
    storeId: string,
    statuses?: readonly SalesChannelConnectionStatus[],
  ): Promise<SalesChannelConnectionRecord[]> {
    const rows = await this.connection
      .select()
      .from(appSalesChannelConnections)
      .where(
        and(
          eq(appSalesChannelConnections.storeId, storeId),
          statuses?.length
            ? inArray(appSalesChannelConnections.status, [...statuses])
            : undefined,
        ),
      )
      .orderBy(desc(appSalesChannelConnections.updatedAt));
    return rows.map(mapConnection);
  }

  listForCurrentStore(
    statuses?: readonly SalesChannelConnectionStatus[],
  ): Promise<SalesChannelConnectionRecord[]> {
    return this.listByStore(this.storeId, statuses);
  }

  async listByInstallation(
    installationId: string,
    includeDisconnected = true,
  ): Promise<SalesChannelConnectionRecord[]> {
    const rows = await this.connection
      .select()
      .from(appSalesChannelConnections)
      .where(
        and(
          eq(
            appSalesChannelConnections.installationId,
            installationId,
          ),
          includeDisconnected
            ? undefined
            : ne(appSalesChannelConnections.status, "DISCONNECTED"),
        ),
      )
      .orderBy(desc(appSalesChannelConnections.updatedAt));
    return rows.map(mapConnection);
  }

  async listByInstallationIdsForStore(
    installationIds: readonly string[],
  ): Promise<SalesChannelConnectionRecord[]> {
    if (installationIds.length === 0) return [];
    const rows = await this.connection
      .select()
      .from(appSalesChannelConnections)
      .where(
        and(
          eq(appSalesChannelConnections.storeId, this.storeId),
          inArray(
            appSalesChannelConnections.installationId,
            [...new Set(installationIds)],
          ),
        ),
      )
      .orderBy(
        appSalesChannelConnections.installationId,
        desc(appSalesChannelConnections.updatedAt),
      );
    return rows.map(mapConnection);
  }

  async getByIdsForStore(
    ids: readonly string[],
  ): Promise<SalesChannelConnectionRecord[]> {
    if (ids.length === 0) return [];
    const rows = await this.connection
      .select()
      .from(appSalesChannelConnections)
      .where(
        and(
          eq(appSalesChannelConnections.storeId, this.storeId),
          inArray(appSalesChannelConnections.id, [...new Set(ids)]),
        ),
      );
    return rows.map(mapConnection);
  }

  async getConnection(
    input: SalesChannelConnectionConnectionInput,
  ): Promise<SalesChannelConnectionConnectionResult> {
    const where: SalesChannelConnectionRelayInput["where"] = {
      storeId: { _eq: this.storeId },
      ...(input.installationId
        ? { installationId: { _eq: input.installationId } }
        : {}),
    };
    const relayInput: SalesChannelConnectionRelayInput = {
      first:
        input.first == null && input.last == null
          ? 20
          : input.first,
      after: input.after,
      last: input.last,
      before: input.before,
      where,
      orderBy: [
        { field: "updatedAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };

    const [result, totalCount] = await Promise.all([
      salesChannelConnectionRelayQuery.execute(
        this.connection,
        relayInput,
      ),
      salesChannelConnectionRelayQuery.count(this.connection, {
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

  async resolveActive(id: string, storeId?: string) {
    const rows = await this.connection
      .select({
        connection: appSalesChannelConnections,
        installationStatus: appInstallations.status,
        appCode: appInstallations.appCode,
        appVersion: appInstallations.installedVersion,
      })
      .from(appSalesChannelConnections)
      .innerJoin(
        appInstallations,
        eq(
          appInstallations.id,
          appSalesChannelConnections.installationId,
        ),
      )
      .where(
        and(
          eq(appSalesChannelConnections.id, id),
          storeId
            ? eq(appSalesChannelConnections.storeId, storeId)
            : undefined,
          eq(appSalesChannelConnections.status, "ACTIVE"),
          eq(appInstallations.status, "ACTIVE"),
        ),
      )
      .limit(1);
    return rows[0]
      ? {
          connection: mapConnection(rows[0].connection),
          installationStatus: rows[0].installationStatus,
          appCode: rows[0].appCode,
          appVersion: rows[0].appVersion,
        }
      : null;
  }
}

function mapConnection(
  row: SalesChannelConnectionModel,
): SalesChannelConnectionRecord {
  return Object.freeze({
    ...row,
    configuration: Object.freeze({ ...row.configuration }),
  });
}

function required<T>(row: T | undefined): T {
  if (!row) throw new Error("Sales channel connection was not returned");
  return row;
}
