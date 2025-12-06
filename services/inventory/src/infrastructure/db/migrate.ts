import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Run database migrations for the inventory schema.
 * Creates the 'inventory' PostgreSQL schema and all tables within it.
 *
 * @param connectionString - PostgreSQL connection string
 * @param migrationsFolder - Path to the migrations folder
 */
export async function runMigrations(
  connectionString: string,
  migrationsFolder: string
): Promise<void> {
  // postgres.js doesn't support schema parameter in connection string
  const cleanUrl = connectionString.replace(/[?&]schema=[^&]+/g, "");

  // Use a dedicated connection with max: 1 for migrations
  const sql = postgres(cleanUrl, { max: 1 });
  const db = drizzle(sql);

  await migrate(db, { migrationsFolder });

  await sql.end();
}
