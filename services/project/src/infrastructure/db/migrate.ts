import { migrate } from "drizzle-orm/postgres-js/migrator";
import { getDatabase } from "./database.js";

export async function runMigrations(migrationsPath: string): Promise<void> {
  const db = getDatabase();
  await migrate(db, { migrationsFolder: migrationsPath });
}
