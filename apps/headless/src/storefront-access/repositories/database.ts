import type { DatabaseClient } from "@shopana/shared-kernel";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./models/index.js";

export type HeadlessDatabase = PostgresJsDatabase<typeof schema>;

export function createHeadlessDatabase(databaseClient: unknown): HeadlessDatabase {
  if (typeof databaseClient !== "function") {
    throw new TypeError("Headless App host.databaseClient must be a postgres.js client");
  }
  return drizzle(databaseClient as DatabaseClient, { schema });
}
