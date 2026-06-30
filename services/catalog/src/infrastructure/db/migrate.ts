import { runner } from "node-pg-migrate";

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

  await runner({
    databaseUrl: cleanUrl,
    dir: `${migrationsFolder}/domains/**/*.sql`,
    useGlob: true,
    direction: "up",
    migrationsTable: "pgmigrations",
    migrationsSchema: "catalog",
    createMigrationsSchema: true,
    singleTransaction: false,
    checkOrder: true,
    log: () => {},
  });
}
