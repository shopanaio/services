import type { DatabaseClient } from "@shopana/shared-kernel";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./models/index.js";

export type OnlineStoreDatabase = PostgresJsDatabase<typeof schema>;

export function createOnlineStoreDatabase(
  databaseClient: unknown,
): OnlineStoreDatabase {
  if (typeof databaseClient !== "function") {
    throw new TypeError(
      "Online Store App host.databaseClient must be a postgres.js client",
    );
  }
  return drizzle(databaseClient as DatabaseClient, { schema });
}
