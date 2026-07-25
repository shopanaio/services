import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../../infrastructure/db/database.js";
import { BaseRepository } from "../BaseRepository.js";
import {
  appInstallationSecrets,
  appInstallations,
} from "../models/index.js";

export interface ResolvedInstallationSecret {
  readonly ciphertext: string;
  readonly installationStatus: string;
  readonly appCode: string;
}

export class AppInstallationSecretRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
  ) {
    super(db, txManager);
  }

  setMany(
    installationId: string,
    secrets: Readonly<Record<string, string>>,
  ): Promise<void> {
    return this.txManager.run(async () => {
      for (const [name, ciphertext] of Object.entries(secrets)) {
        await this.connection
          .insert(appInstallationSecrets)
          .values({
            installationId,
            name,
            ciphertext,
            revokedAt: null,
          })
          .onConflictDoUpdate({
            target: [
              appInstallationSecrets.installationId,
              appInstallationSecrets.name,
            ],
            set: {
              ciphertext,
              version: sql`${appInstallationSecrets.version} + 1`,
              revokedAt: null,
              updatedAt: new Date().toISOString(),
            },
          });
      }
    });
  }

  async resolve(
    installationId: string,
    appCode: string,
    name: string,
  ): Promise<ResolvedInstallationSecret | null> {
    const rows = await this.connection
      .select({
        ciphertext: appInstallationSecrets.ciphertext,
        installationStatus: appInstallations.status,
        appCode: appInstallations.appCode,
      })
      .from(appInstallationSecrets)
      .innerJoin(
        appInstallations,
        eq(appInstallations.id, appInstallationSecrets.installationId),
      )
      .where(
        and(
          eq(appInstallationSecrets.installationId, installationId),
          eq(appInstallationSecrets.name, name),
          eq(appInstallations.appCode, appCode),
          isNull(appInstallationSecrets.revokedAt),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async listActiveNames(
    installationId: string,
  ): Promise<readonly string[]> {
    const rows = await this.connection
      .select({ name: appInstallationSecrets.name })
      .from(appInstallationSecrets)
      .where(
        and(
          eq(
            appInstallationSecrets.installationId,
            installationId,
          ),
          isNull(appInstallationSecrets.revokedAt),
        ),
      )
      .orderBy(asc(appInstallationSecrets.name));
    return Object.freeze(rows.map((row) => row.name));
  }

  async revokeAll(installationId: string): Promise<void> {
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
            installationId,
          ),
          isNull(appInstallationSecrets.revokedAt),
        ),
      );
  }
}
