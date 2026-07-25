import { and, desc, eq } from "drizzle-orm";
import type { AppManifest } from "@shopana/app-sdk";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { AppManifestSnapshot } from "../../control-plane/types.js";
import type { Database } from "../../infrastructure/db/database.js";
import { BaseRepository } from "../BaseRepository.js";
import { appInstallationManifestSnapshots } from "../models/index.js";

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
}

function mapSnapshot(
  row: typeof appInstallationManifestSnapshots.$inferSelect,
): AppManifestSnapshotRecord {
  return {
    ...row,
    manifest: row.manifest as AppManifest,
  };
}
