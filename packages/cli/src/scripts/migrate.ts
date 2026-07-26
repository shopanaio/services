#!/usr/bin/env tsx

/**
 * Database migrations for all services
 * Uses drizzle-orm, reads migrationsPath from build.config.json
 * Reads database config from config.yml (same as services)
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { load as yamlLoad } from "js-yaml";
import { findRootDir } from "../utils.js";
import {
  discoverProjectUnits,
  findProjectUnit,
  type ProjectUnitKind,
} from "../project-units.js";

const rootDir = findRootDir();
interface MigrationsConfig {
  path: string;
  type: "drizzle" | "node-pg-migrate" | "typeorm" | "prisma";
  schema?: string;
  table?: string;
}

interface BuildConfig {
  entryPoint: string;
  migrations?: MigrationsConfig;
  assets?: unknown[];
}

interface ServiceMigrationConfig {
  name: string;
  kind: ProjectUnitKind;
  unitPath: string;
  path: string;
  type: "drizzle" | "node-pg-migrate" | "typeorm" | "prisma";
  migrationsSchema?: string;
  migrationsTable?: string;
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
  db?: DatabaseConfig;
  database?: DatabaseConfig;
  [key: string]: unknown;
}

interface ConfigStructure {
  global?: Record<string, unknown>;
  shared?: {
    db?: { default: DatabaseConfig };
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

  for (const unit of discoverProjectUnits()) {
    const buildConfig = readBuildConfig(unit.path);
    if (buildConfig?.migrations?.path && buildConfig?.migrations?.type) {
      services.push({
        name: unit.name,
        kind: unit.kind,
        unitPath: unit.path,
        path: buildConfig.migrations.path,
        type: buildConfig.migrations.type,
        migrationsSchema: buildConfig.migrations.schema,
        migrationsTable: buildConfig.migrations.table,
      });
    }
  }

  return services.sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === "service" ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });
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
  const dbConfig = serviceConfig?.db ?? serviceConfig?.database;

  if (dbConfig) {
    return buildDatabaseUrl(dbConfig);
  }

  // Fallback to shared database config
  const sharedDbConfig =
    config.shared?.db?.default ?? config.shared?.database?.default;
  if (sharedDbConfig) {
    return buildDatabaseUrl(sharedDbConfig);
  }

  return null;
}

function getProjectUnitDatabaseUrl(
  name: string,
  kind: ProjectUnitKind,
): string | null {
  return getServiceDatabaseUrl(kind === "app" ? "apps" : name);
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

async function runNodePgMigrateMigration(
  connectionString: string,
  migrationsFolder: string,
  serviceName: string,
  migrationsSchema?: string,
  migrationsTable?: string
): Promise<void> {
  const { runner } = await import("node-pg-migrate");
  const cleanUrl = connectionString.replace(/[?&]schema=[^&]+/g, "");

  await runner({
    databaseUrl: cleanUrl,
    dir: `${migrationsFolder}/domains/**/*.sql`,
    useGlob: true,
    direction: "up",
    migrationsTable: migrationsTable ?? "pgmigrations",
    migrationsSchema: migrationsSchema ?? serviceName,
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
  const fullMigrationsPath = join(config.unitPath, config.path);

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
        serviceName,
        config.migrationsSchema,
        config.migrationsTable
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
export async function runMigration(
  serviceName: string,
  kind: ProjectUnitKind = "service",
): Promise<boolean> {
  const unit = findProjectUnit(serviceName, kind);
  const buildConfig = unit ? readBuildConfig(unit.path) : null;

  if (!buildConfig?.migrations?.path || !buildConfig?.migrations?.type) {
    console.error(`\n❌ ${kind} "${serviceName}" does not have migrations configured in build.config.json`);
    return false;
  }

  const databaseUrl =
    getProjectUnitDatabaseUrl(serviceName, kind) ?? getDatabaseUrl();

  console.log(`\n📦 Migrating ${serviceName}...`);
  console.log(`   Database: ${databaseUrl.replace(/:[^:@]+@/, ":***@")}`);

  const config: ServiceMigrationConfig = {
    name: serviceName,
    kind,
    unitPath: unit!.path,
    path: buildConfig.migrations.path,
    type: buildConfig.migrations.type,
    migrationsSchema: buildConfig.migrations.schema,
    migrationsTable: buildConfig.migrations.table,
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
    const databaseUrl =
      getProjectUnitDatabaseUrl(service.name, service.kind) ?? getDatabaseUrl();
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
  return discoverMigratableServices()
    .filter((unit) => unit.kind === "service")
    .map((unit) => unit.name);
}

export function listMigratableApps(): string[] {
  return discoverMigratableServices()
    .filter((unit) => unit.kind === "app")
    .map((unit) => unit.name);
}
