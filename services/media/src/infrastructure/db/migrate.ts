import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function runMigrations(connectionString: string): Promise<void> {
  const sql = postgres(connectionString);

  try {
    // Create migrations tracking table if not exists
    await sql`
      CREATE TABLE IF NOT EXISTS media.schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
  } catch {
    // Schema might not exist yet, create it first
    await sql`CREATE SCHEMA IF NOT EXISTS media`;
    await sql`
      CREATE TABLE IF NOT EXISTS media.schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
  }

  // Get migrations directory - handle both development and production paths
  const possiblePaths = [
    join(__dirname, "../../../migrations"), // from dist/src/infrastructure/db
    join(__dirname, "../../migrations"), // alternative path
  ];

  let migrationsDir: string | null = null;
  for (const path of possiblePaths) {
    try {
      readdirSync(path);
      migrationsDir = path;
      break;
    } catch {
      continue;
    }
  }

  if (!migrationsDir) {
    console.log("[migrate] No migrations directory found, skipping migrations");
    await sql.end();
    return;
  }

  // Get all migration files (only .sql files, not rollback)
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql") && !f.includes("rollback"))
    .sort();

  // Get already executed migrations
  const executed = await sql<{ name: string }[]>`
    SELECT name FROM media.schema_migrations ORDER BY id
  `;
  const executedNames = new Set(executed.map((r) => r.name));

  // Run pending migrations
  for (const file of files) {
    if (executedNames.has(file)) {
      continue;
    }

    console.log(`[migrate] Running migration: ${file}`);
    const migrationSql = readFileSync(join(migrationsDir, file), "utf-8");

    try {
      await sql.unsafe(migrationSql);
      await sql`INSERT INTO media.schema_migrations (name) VALUES (${file})`;
      console.log(`[migrate] Completed: ${file}`);
    } catch (error) {
      console.error(`[migrate] Failed to run migration ${file}:`, error);
      throw error;
    }
  }

  await sql.end();
  console.log("[migrate] All migrations completed");
}
