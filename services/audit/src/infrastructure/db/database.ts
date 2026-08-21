import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Sql } from "postgres";
import * as schema from "../../repositories/models/index.js";

export type Database = PostgresJsDatabase<typeof schema>;

let database: Database | null = null;

export function createDatabase(client: Sql): Database {
  database ??= drizzle(client, { schema });
  return database;
}
