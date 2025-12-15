#!/usr/bin/env tsx

/**
 * Database migrations for all services
 * Uses drizzle-orm for inventory and media services
 * Reads database_url from config.local.yml (same as services)
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { load as yamlLoad } from "js-yaml";
import { findRootDir } from "../utils.js";

const rootDir = findRootDir();
const servicesDir = join(rootDir, "services");

// Services with drizzle migrations
const MIGRATEABLE_SERVICES = [
  {
    name: "inventory",
    migrationsPath: "dist/migrations",
  },
  {
    name: "media",
    migrationsPath: "dist/migrations",
  },
];

interface ConfigStructure {
  vars?: Record<string, unknown>;
  services?: Record<string, { database_url?: string }>;
}

/**
 * Load config from config.local.yml or config.yml
 */
function loadConfig(): ConfigStructure {
  const configFile = process.env.CONFIG_FILE || "config.local.yml";
  const configPath = join(rootDir, configFile);

  if (!existsSync(configPath)) {
    // Fallback to config.yml
    const fallbackPath = join(rootDir, "config.yml");
    if (existsSync(fallbackPath)) {
      const content = readFileSync(fallbackPath, "utf-8");
      return yamlLoad(content) as ConfigStructure;
    }
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
  return config.services?.[serviceName]?.database_url || null;
}

interface MigrationResult {
  service: string;
  success: boolean;
  error?: string;
}

async function runDrizzleMigration(
  connectionString: string,
  migrationsFolder: string
): Promise<void> {
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const postgres = (await import("postgres")).default;

  const cleanUrl = connectionString.replace(/[?&]schema=[^&]+/g, "");
  const sql = postgres(cleanUrl, { max: 1 });
  const db = drizzle(sql);

  await migrate(db, { migrationsFolder });
  await sql.end();
}

async function migrateService(
  serviceName: string,
  databaseUrl: string
): Promise<MigrationResult> {
  const serviceConfig = MIGRATEABLE_SERVICES.find((s) => s.name === serviceName);

  if (!serviceConfig) {
    return {
      service: serviceName,
      success: false,
      error: `Service "${serviceName}" does not support migrations`,
    };
  }

  const serviceDir = join(servicesDir, serviceName);
  const migrationsPath = join(serviceDir, serviceConfig.migrationsPath);

  if (!existsSync(migrationsPath)) {
    return {
      service: serviceName,
      success: false,
      error: `Migrations folder not found: ${migrationsPath}`,
    };
  }

  try {
    await runDrizzleMigration(databaseUrl, migrationsPath);
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

  // Try inventory config as default (most services use same DB)
  const inventoryUrl = getServiceDatabaseUrl("inventory");
  if (inventoryUrl) {
    return inventoryUrl;
  }

  // Default local development URL
  return "postgres://postgres:postgres@localhost:5432/portal";
}

/**
 * Run migrations for specific service
 */
export async function runMigration(serviceName: string): Promise<boolean> {
  const databaseUrl = getDatabaseUrl(serviceName);

  console.log(`\n📦 Migrating ${serviceName}...`);
  console.log(`   Database: ${databaseUrl.replace(/:[^:@]+@/, ":***@")}`);

  const result = await migrateService(serviceName, databaseUrl);

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
  console.log("📋 Running migrations for all services\n");

  // Show database URL from config
  const defaultUrl = getDatabaseUrl();
  console.log(`   Config: config.local.yml`);
  console.log(`   Database: ${defaultUrl.replace(/:[^:@]+@/, ":***@")}\n`);

  const results: MigrationResult[] = [];

  for (const service of MIGRATEABLE_SERVICES) {
    const databaseUrl = getDatabaseUrl(service.name);
    console.log(`📦 Migrating ${service.name}...`);

    const result = await migrateService(service.name, databaseUrl);
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
  return MIGRATEABLE_SERVICES.map((s) => s.name);
}
