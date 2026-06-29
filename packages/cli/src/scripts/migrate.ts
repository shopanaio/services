#!/usr/bin/env tsx

/**
 * Database migrations for all services
 * Uses drizzle-orm, reads migrationsPath from build.config.json
 * Reads database config from config.yml (same as services)
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { load as yamlLoad } from "js-yaml";
import { findRootDir } from "../utils.js";

const rootDir = findRootDir();
const servicesDir = join(rootDir, "services");

interface MigrationsConfig {
  path: string;
  type: "drizzle" | "node-pg-migrate" | "typeorm" | "prisma";
}

interface BuildConfig {
  entryPoint: string;
  migrations?: MigrationsConfig;
  assets?: unknown[];
}

interface ServiceMigrationConfig {
  name: string;
  path: string;
  type: "drizzle" | "node-pg-migrate" | "typeorm" | "prisma";
}

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  schema?: string | null;
}

interface ServiceConfig {
  database?: DatabaseConfig;
  [key: string]: unknown;
}

interface ConfigStructure {
  global?: Record<string, unknown>;
  shared?: {
    database?: { default: DatabaseConfig };
  };
  services?: Record<string, ServiceConfig>;
}

function buildDatabaseUrl(config: DatabaseConfig): string {
  const { host, port, user, password, database, schema } = config;
  const baseUrl = `postgresql://${user}:${password}@${host}:${port}/${database}`;
  return schema ? `${baseUrl}?schema=${schema}` : baseUrl;
}

/**
 * Read build.config.json from service directory
 */
function readBuildConfig(servicePath: string): BuildConfig | null {
  const configPath = join(servicePath, "build.config.json");

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Discover all services with migrations configured in build.config.json
 */
function discoverMigratableServices(): ServiceMigrationConfig[] {
  const services: ServiceMigrationConfig[] = [];

  for (const name of readdirSync(servicesDir)) {
    const servicePath = join(servicesDir, name);
    if (!statSync(servicePath).isDirectory()) continue;

    const buildConfig = readBuildConfig(servicePath);
    if (buildConfig?.migrations?.path && buildConfig?.migrations?.type) {
      services.push({
        name,
        path: buildConfig.migrations.path,
        type: buildConfig.migrations.type,
      });
    }
  }

  return services;
}

/**
 * Load config from config.yml
 */
function loadConfig(): ConfigStructure {
  const configFile = process.env.CONFIG_FILE || "config.yml";
  const configPath = join(rootDir, configFile);

  if (!existsSync(configPath)) {
    return {};
  }

  const content = readFileSync(configPath, "utf-8");
  return yamlLoad(content) as ConfigStructure;
}

/**
 * Get database URL for a specific service from config
 */
function getServiceDatabaseUrl(serviceName: string): string | null {
  const config = loadConfig();
  const serviceConfig = config.services?.[serviceName];

  if (serviceConfig?.database) {
    return buildDatabaseUrl(serviceConfig.database);
  }

  // Fallback to shared database config
  if (config.shared?.database?.default) {
    return buildDatabaseUrl(config.shared.database.default);
  }

  return null;
}

interface MigrationResult {
  service: string;
  success: boolean;
  error?: string;
}

async function runDrizzleMigration(
  connectionString: string,
  migrationsFolder: string,
  serviceName: string
): Promise<void> {
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const postgres = (await import("postgres")).default;

  const cleanUrl = connectionString.replace(/[?&]schema=[^&]+/g, "");
  const sql = postgres(cleanUrl, { max: 1, onnotice: () => {} });
  const db = drizzle(sql);

  await migrate(db, {
    migrationsFolder,
    migrationsTable: `__drizzle_migrations_${serviceName}`,
    migrationsSchema: "drizzle"
  });
  await sql.end();
}

interface DrizzleJournal {
  entries?: Array<{
    tag?: string;
    when?: number;
  }>;
}

async function seedNodePgMigrateStateFromDrizzle(
  connectionString: string,
  migrationsFolder: string,
  serviceName: string
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

  const postgres = (await import("postgres")).default;
  const cleanUrl = connectionString.replace(/[?&]schema=[^&]+/g, "");
  const sql = postgres(cleanUrl, { max: 1, onnotice: () => {} });

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
      `drizzle.__drizzle_migrations_${serviceName}`,
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

async function runNodePgMigrateMigration(
  connectionString: string,
  migrationsFolder: string,
  serviceName: string
): Promise<void> {
  const { runner } = await import("node-pg-migrate");
  const cleanUrl = connectionString.replace(/[?&]schema=[^&]+/g, "");

  await seedNodePgMigrateStateFromDrizzle(
    cleanUrl,
    migrationsFolder,
    serviceName
  );

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

async function migrateService(
  serviceName: string,
  config: ServiceMigrationConfig,
  databaseUrl: string
): Promise<MigrationResult> {
  const serviceDir = join(servicesDir, serviceName);
  const fullMigrationsPath = join(serviceDir, config.path);

  if (!existsSync(fullMigrationsPath)) {
    return {
      service: serviceName,
      success: false,
      error: `Migrations folder not found: ${config.path}`,
    };
  }

  try {
    if (config.type === "drizzle") {
      await runDrizzleMigration(databaseUrl, fullMigrationsPath, serviceName);
    } else if (config.type === "node-pg-migrate") {
      await runNodePgMigrateMigration(
        databaseUrl,
        fullMigrationsPath,
        serviceName
      );
    } else {
      return {
        service: serviceName,
        success: false,
        error: `Migration type "${config.type}" not yet supported`,
      };
    }
    return { service: serviceName, success: true };
  } catch (error: any) {
    return {
      service: serviceName,
      success: false,
      error: error.message,
    };
  }
}

function getDatabaseUrl(serviceName?: string): string {
  // Try environment variable first
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Try to get from config for specific service
  if (serviceName) {
    const serviceUrl = getServiceDatabaseUrl(serviceName);
    if (serviceUrl) {
      return serviceUrl;
    }
  }

  // Try catalog config as default (most services use same DB)
  const catalogUrl = getServiceDatabaseUrl("catalog");
  if (catalogUrl) {
    return catalogUrl;
  }

  // Default local development URL
  return "postgres://postgres:postgres@localhost:5432/portal";
}

/**
 * Run migrations for specific service
 */
export async function runMigration(serviceName: string): Promise<boolean> {
  const servicePath = join(servicesDir, serviceName);
  const buildConfig = readBuildConfig(servicePath);

  if (!buildConfig?.migrations?.path || !buildConfig?.migrations?.type) {
    console.error(`\n❌ Service "${serviceName}" does not have migrations configured in build.config.json`);
    return false;
  }

  const databaseUrl = getDatabaseUrl(serviceName);

  console.log(`\n📦 Migrating ${serviceName}...`);
  console.log(`   Database: ${databaseUrl.replace(/:[^:@]+@/, ":***@")}`);

  const config: ServiceMigrationConfig = {
    name: serviceName,
    path: buildConfig.migrations.path,
    type: buildConfig.migrations.type,
  };

  const result = await migrateService(serviceName, config, databaseUrl);

  if (result.success) {
    console.log(`   ✅ ${serviceName} migrated successfully`);
    return true;
  } else {
    console.error(`   ❌ ${serviceName}: ${result.error}`);
    return false;
  }
}

/**
 * Run migrations for all services
 */
export async function runAllMigrations(): Promise<boolean> {
  const migratableServices = discoverMigratableServices();

  if (migratableServices.length === 0) {
    console.log("📋 No services with migrations found\n");
    return true;
  }

  console.log(`📋 Running migrations for ${migratableServices.length} service(s)\n`);

  // Show database URL from config
  const defaultUrl = getDatabaseUrl();
  console.log(`   Config: ${process.env.CONFIG_FILE || "config.yml"}`);
  console.log(`   Database: ${defaultUrl.replace(/:[^:@]+@/, ":***@")}\n`);

  const results: MigrationResult[] = [];

  for (const service of migratableServices) {
    const databaseUrl = getDatabaseUrl(service.name);
    console.log(`📦 Migrating ${service.name}...`);

    const result = await migrateService(service.name, service, databaseUrl);
    results.push(result);

    if (result.success) {
      console.log(`   ✅ Done`);
    } else {
      console.error(`   ❌ ${result.error}`);
    }
  }

  const failed = results.filter((r) => !r.success);
  const succeeded = results.filter((r) => r.success);

  console.log(`\n${"═".repeat(50)}\n`);

  if (failed.length === 0) {
    console.log(`✅ All ${succeeded.length} service(s) migrated successfully`);
    return true;
  } else {
    console.log(`⚠️  ${succeeded.length} succeeded, ${failed.length} failed`);
    return false;
  }
}

/**
 * List available services for migration
 */
export function listMigratableServices(): string[] {
  return discoverMigratableServices().map((s) => s.name);
}
