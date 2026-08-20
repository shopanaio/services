import { runner } from "node-pg-migrate";

export async function runMigrations(
  connectionString: string,
  migrationsFolder: string,
): Promise<void> {
  const cleanUrl = connectionString.replace(/[?&]schema=[^&]+/g, "");

  await runner({
    databaseUrl: cleanUrl,
    dir: `${migrationsFolder}/domains/**/*.sql`,
    useGlob: true,
    direction: "up",
    migrationsTable: "pgmigrations",
    migrationsSchema: "listing",
    createMigrationsSchema: true,
    singleTransaction: false,
    checkOrder: true,
    log: () => {},
  });
}
