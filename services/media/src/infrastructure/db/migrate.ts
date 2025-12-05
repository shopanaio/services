import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export async function runMigrations(connectionString: string): Promise<void> {
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  // Get path relative to this file: dist/src/infrastructure/db/migrate.js -> migrations/
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = join(__dirname, "../../../../migrations");

  await migrate(db, { migrationsFolder });

  await sql.end();
}
