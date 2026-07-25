import {
  and,
  asc,
  eq,
  isNull,
  notInArray,
} from "drizzle-orm";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../../infrastructure/db/database.js";
import { BaseRepository } from "../BaseRepository.js";
import { appInstallationScopes } from "../models/index.js";

export interface AppInstallationScopeRecord {
  readonly id: string;
  readonly installationId: string;
  readonly scope: string;
  readonly grantedAt: string;
  readonly revokedAt: string | null;
}

export class AppInstallationScopeRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
  ) {
    super(db, txManager);
  }

  async listGranted(
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

  async listByInstallation(
    installationId: string,
  ): Promise<AppInstallationScopeRecord[]> {
    return this.connection
      .select()
      .from(appInstallationScopes)
      .where(
        eq(appInstallationScopes.installationId, installationId),
      )
      .orderBy(asc(appInstallationScopes.scope));
  }

  async replace(
    installationId: string,
    scopes: readonly string[],
  ): Promise<void> {
    const normalized = [...new Set(scopes)].sort();
    const activeScope = and(
      eq(appInstallationScopes.installationId, installationId),
      isNull(appInstallationScopes.revokedAt),
    );

    await this.connection
      .update(appInstallationScopes)
      .set({ revokedAt: new Date().toISOString() })
      .where(
        normalized.length > 0
          ? and(
              activeScope,
              notInArray(appInstallationScopes.scope, normalized),
            )
          : activeScope,
      );

    for (const scope of normalized) {
      await this.connection
        .insert(appInstallationScopes)
        .values({ installationId, scope, revokedAt: null })
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

  async revokeAll(installationId: string): Promise<void> {
    await this.connection
      .update(appInstallationScopes)
      .set({ revokedAt: new Date().toISOString() })
      .where(
        and(
          eq(appInstallationScopes.installationId, installationId),
          isNull(appInstallationScopes.revokedAt),
        ),
      );
  }
}
