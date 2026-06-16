import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Sql } from "postgres";
import * as schema from "../../repositories/models/index.js";

type DrizzleDatabase = PostgresJsDatabase<typeof schema>;

let database: DrizzleDatabase | null = null;

export type Database = DrizzleDatabase;

export function createDatabase(client: Sql): Database {
  if (database) {
    return database;
  }

  database = drizzle(client, { schema });
  return database;
}

export function getDatabase(): Database {
  if (!database) {
    throw new Error("Database not initialized. Call createDatabase() first.");
  }
  return database;
}
