import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { runner } from "node-pg-migrate";
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

  await seedNodePgMigrateStateFromDrizzle(cleanUrl, migrationsFolder);

  await runner({
    databaseUrl: cleanUrl,
    dir: migrationsFolder,
    direction: "up",
    migrationsTable: "pgmigrations",
    migrationsSchema: "catalog",
    createMigrationsSchema: true,
    singleTransaction: false,
    checkOrder: true,
    log: () => {},
  });
}

interface DrizzleJournal {
  entries?: Array<{
    tag?: string;
    when?: number;
  }>;
}

async function seedNodePgMigrateStateFromDrizzle(
  connectionString: string,
  migrationsFolder: string
): Promise<void> {
  const journalPath = join(migrationsFolder, "meta", "_journal.json");

  if (!existsSync(journalPath)) {
    return;
  }

  const journal = JSON.parse(
    readFileSync(journalPath, "utf-8")
  ) as DrizzleJournal;
  const journalEntries = journal.entries ?? [];

  if (journalEntries.length === 0) {
    return;
  }

  const sql = postgres(connectionString, { max: 1, onnotice: () => {} });

  try {
    await sql`CREATE SCHEMA IF NOT EXISTS "catalog"`;
    await sql`
      CREATE TABLE IF NOT EXISTS "catalog"."pgmigrations" (
        id SERIAL PRIMARY KEY,
        name varchar(255) NOT NULL,
        run_on timestamp NOT NULL
      )
    `;

    const legacyTables = [
      "drizzle.__drizzle_migrations_catalog",
      "drizzle.__drizzle_migrations",
    ];
    const appliedMigrationTimes = new Set<number>();

    for (const legacyTable of legacyTables) {
      const tableExists = await sql<{ regclass: string | null }[]>`
        SELECT to_regclass(${legacyTable}) AS regclass
      `;

      if (!tableExists[0]?.regclass) {
        continue;
      }

      const rows = await sql<{ created_at: string }[]>`
        SELECT created_at::text AS created_at
        FROM ${sql.unsafe(legacyTable)}
        ORDER BY created_at
      `;

      for (const row of rows) {
        appliedMigrationTimes.add(Number(row.created_at));
      }
    }

    if (appliedMigrationTimes.size === 0) {
      return;
    }

    for (const entry of journalEntries) {
      if (
        !entry.tag ||
        typeof entry.when !== "number" ||
        !appliedMigrationTimes.has(entry.when)
      ) {
        continue;
      }

      await sql`
        INSERT INTO "catalog"."pgmigrations" (name, run_on)
        SELECT ${entry.tag}, NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM "catalog"."pgmigrations" WHERE name = ${entry.tag}
        )
      `;
    }
  } finally {
    await sql.end();
  }
}
