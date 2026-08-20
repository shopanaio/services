import type { DatabaseClient } from "@shopana/shared-kernel";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./models/index.js";

export type SmtpDatabase = PostgresJsDatabase<typeof schema>;

export function createSmtpDatabase(databaseClient: unknown): SmtpDatabase {
  if (typeof databaseClient !== "function") {
    throw new TypeError("SMTP App host.databaseClient must be a postgres.js client");
  }
  return drizzle(databaseClient as DatabaseClient, { schema });
}
