import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { DatabaseClient } from "@shopana/shared-kernel";
import type { Sql } from "postgres";
import * as schema from "../../repositories/models/index.js";

export type Database = PostgresJsDatabase<typeof schema>;

export function createDatabase(client: DatabaseClient): Database {
  return drizzle(client as unknown as Sql, { schema });
}
