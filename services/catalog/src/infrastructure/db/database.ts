import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Sql, TransactionSql } from "postgres";
import * as schema from "../../repositories/models/index.js";

type DrizzleDatabase = PostgresJsDatabase<typeof schema>;

let database: DrizzleDatabase | null = null;

export type Database = DrizzleDatabase;

/**
 * Create Drizzle database instance using shared postgres client
 * The client pool is managed by DatabaseModule in bootstrap
 */
export function createDatabase(client: Sql): Database {
  if (database) {
    return database;
  }

  database = drizzle(client, { schema });
  return database;
}

/**
 * Create a request-scoped Drizzle wrapper over the active DBOS datasource
 * transaction. This must never use the singleton root database cache.
 */
export function createTransactionalDatabase(
  client: TransactionSql
): Database {
  return drizzle(client, { schema });
}

export function getDatabase(): Database {
  if (!database) {
    throw new Error("Database not initialized. Call createDatabase() first.");
  }
  return database;
}
