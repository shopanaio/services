import type { TransactionManager } from "@shopana/shared-kernel";
import { and, eq, exists } from "drizzle-orm";
import type { HeadlessDatabase } from "./database.js";
import { headlessStorefrontConnections } from "./models/index.js";
import type { HeadlessStorefrontScope } from "./types.js";

export abstract class BaseRepository {
  constructor(
    protected readonly db: HeadlessDatabase,
    protected readonly txManager: TransactionManager<HeadlessDatabase>,
  ) {}

  protected get connection(): HeadlessDatabase {
    return this.txManager.getConnection() as HeadlessDatabase;
  }

  protected connectionOwnership(scope: HeadlessStorefrontScope, connectionId: string) {
    return and(eq(headlessStorefrontConnections.id, connectionId), this.connectionScope(scope));
  }

  protected connectionScope(scope: HeadlessStorefrontScope) {
    return and(
      eq(headlessStorefrontConnections.installationId, scope.installationId),
      eq(headlessStorefrontConnections.organizationId, scope.organizationId),
      eq(headlessStorefrontConnections.storeId, scope.storeId),
    );
  }

  protected ownedConnectionExists(scope: HeadlessStorefrontScope, connectionId: string) {
    return exists(
      this.connection
        .select({ id: headlessStorefrontConnections.id })
        .from(headlessStorefrontConnections)
        .where(this.connectionOwnership(scope, connectionId)),
    );
  }
}
