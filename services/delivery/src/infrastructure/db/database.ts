import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Sql } from "postgres";
import * as schema from "../../repositories/models/index.js";

export type Database = PostgresJsDatabase<typeof schema>;

export function createDatabase(client: Sql): Database {
  return drizzle(client, { schema });
}
