import { and, desc, eq, inArray } from "drizzle-orm";
import type { TransactionManager } from "@shopana/shared-kernel";
import type {
  SalesChannelSpecificationSnapshotRecord,
} from "../../control-plane/types.js";
import type { Database } from "../../infrastructure/db/database.js";
import { BaseRepository } from "../BaseRepository.js";
import {
  appInstallations,
  appSalesChannelSpecificationSnapshots,
  type SalesChannelSpecificationSnapshotModel,
} from "../models/index.js";

export class SalesChannelSpecificationSnapshotRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
  ) {
    super(db, txManager);
  }

  async save(input: {
    readonly installationId: string;
    readonly appCode: string;
    readonly appVersion: string;
    readonly manifestHash: string;
    readonly handle: string;
    readonly label: string;
    readonly definition: Readonly<Record<string, unknown>>;
    readonly definitionHash: string;
  }): Promise<SalesChannelSpecificationSnapshotRecord> {
    const rows = await this.connection
      .insert(appSalesChannelSpecificationSnapshots)
      .values({ ...input, definition: { ...input.definition } })
      .onConflictDoNothing()
      .returning();
    if (rows[0]) {
      return mapSnapshot(rows[0]);
    }
    const existing = await this.findByVersion(
      input.installationId,
      input.appVersion,
      input.manifestHash,
      input.handle,
    );
    if (!existing) {
      throw new Error("Sales channel specification snapshot was not persisted");
    }
    return existing;
  }

  async findById(
    id: string,
  ): Promise<SalesChannelSpecificationSnapshotRecord | null> {
    const rows = await this.connection
      .select()
      .from(appSalesChannelSpecificationSnapshots)
      .where(eq(appSalesChannelSpecificationSnapshots.id, id))
      .limit(1);
    return rows[0] ? mapSnapshot(rows[0]) : null;
  }

  async findByIdForStore(
    id: string,
  ): Promise<SalesChannelSpecificationSnapshotRecord | null> {
    const rows = await this.connection
      .select()
      .from(appSalesChannelSpecificationSnapshots)
      .innerJoin(
        appInstallations,
        eq(
          appInstallations.id,
          appSalesChannelSpecificationSnapshots.installationId,
        ),
      )
      .where(
        and(
          eq(appInstallations.storeId, this.storeId),
          eq(appSalesChannelSpecificationSnapshots.id, id),
        ),
      )
      .limit(1);
    return rows[0]
      ? mapSnapshot(rows[0].app_sales_channel_specification_snapshots)
      : null;
  }

  async findCurrent(
    installationId: string,
    handle: string,
    appVersion?: string,
  ): Promise<SalesChannelSpecificationSnapshotRecord | null> {
    const rows = await this.connection
      .select()
      .from(appSalesChannelSpecificationSnapshots)
      .where(
        and(
          eq(
            appSalesChannelSpecificationSnapshots.installationId,
            installationId,
          ),
          eq(appSalesChannelSpecificationSnapshots.handle, handle),
          appVersion
            ? eq(
                appSalesChannelSpecificationSnapshots.appVersion,
                appVersion,
              )
            : undefined,
        ),
      )
      .orderBy(desc(appSalesChannelSpecificationSnapshots.createdAt))
      .limit(1);
    return rows[0] ? mapSnapshot(rows[0]) : null;
  }

  async listByInstallation(
    installationId: string,
    appVersion?: string,
  ): Promise<SalesChannelSpecificationSnapshotRecord[]> {
    const rows = await this.connection
      .select()
      .from(appSalesChannelSpecificationSnapshots)
      .where(
        and(
          eq(
            appSalesChannelSpecificationSnapshots.installationId,
            installationId,
          ),
          appVersion
            ? eq(
                appSalesChannelSpecificationSnapshots.appVersion,
                appVersion,
              )
            : undefined,
        ),
      )
      .orderBy(
        appSalesChannelSpecificationSnapshots.handle,
        desc(appSalesChannelSpecificationSnapshots.createdAt),
      );
    return rows.map(mapSnapshot);
  }

  async getByIds(
    ids: readonly string[],
  ): Promise<SalesChannelSpecificationSnapshotRecord[]> {
    if (ids.length === 0) return [];
    const rows = await this.connection
      .select()
      .from(appSalesChannelSpecificationSnapshots)
      .where(
        inArray(appSalesChannelSpecificationSnapshots.id, [...new Set(ids)]),
      );
    return rows.map(mapSnapshot);
  }

  private async findByVersion(
    installationId: string,
    appVersion: string,
    manifestHash: string,
    handle: string,
  ): Promise<SalesChannelSpecificationSnapshotRecord | null> {
    const rows = await this.connection
      .select()
      .from(appSalesChannelSpecificationSnapshots)
      .where(
        and(
          eq(
            appSalesChannelSpecificationSnapshots.installationId,
            installationId,
          ),
          eq(appSalesChannelSpecificationSnapshots.appVersion, appVersion),
          eq(appSalesChannelSpecificationSnapshots.manifestHash, manifestHash),
          eq(appSalesChannelSpecificationSnapshots.handle, handle),
        ),
      )
      .limit(1);
    return rows[0] ? mapSnapshot(rows[0]) : null;
  }
}

function mapSnapshot(
  row: SalesChannelSpecificationSnapshotModel,
): SalesChannelSpecificationSnapshotRecord {
  return Object.freeze({
    ...row,
    definition: Object.freeze({ ...row.definition }),
  });
}
