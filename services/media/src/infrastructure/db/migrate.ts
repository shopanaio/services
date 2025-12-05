import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export async function runMigrations(
  connectionString: string,
  migrationsFolder: string
): Promise<void> {
  // Remove schema parameter if present (not supported by postgres.js)
  const cleanUrl = connectionString.replace(/[?&]schema=[^&]+/g, '');

  const sql = postgres(cleanUrl, { max: 1 });
  const db = drizzle(sql);

  await migrate(db, { migrationsFolder });

  await sql.end();
}
