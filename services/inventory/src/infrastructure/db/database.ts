import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../repositories/models/index.js";

type DrizzleDatabase = PostgresJsDatabase<typeof schema>;

let client: ReturnType<typeof postgres> | null = null;
let database: DrizzleDatabase | null = null;

export type Database = DrizzleDatabase;

export function initDatabase(connectionString: string): Database {
  if (database) {
    return database;
  }
  // postgres.js doesn't support schema parameter in connection string
  const cleanUrl = connectionString.replace(/[?&]schema=[^&]+/g, "");
  client = postgres(cleanUrl, {
    types: {
      // Parse timestamp/timestamptz as Date instead of string
      date: {
        to: 1184, // timestamptz OID
        from: [1114, 1184], // timestamp and timestamptz OIDs
        serialize: (x: Date) => x.toISOString(),
        parse: (x: string) => new Date(x),
      },
    },
  });
  database = drizzle(client, { schema });
  return database;
}

export function getDatabase(): Database {
  if (!database) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return database;
}

export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.end();
    client = null;
    database = null;
  }
}
