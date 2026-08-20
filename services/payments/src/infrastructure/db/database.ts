import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Sql } from "postgres";
import * as schema from "./schema.js";

export type PaymentsDatabase = PostgresJsDatabase<typeof schema>;
export function createPaymentsDatabase(client: Sql): PaymentsDatabase {
  return drizzle(client, { schema });
}
