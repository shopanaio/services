#!/usr/bin/env tsx

/**
 * Database migration generation for all services
 * Calls `db:generate` script from service's package.json if it exists
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { execa } from "execa";
import chalk from "chalk";
import { findRootDir } from "../utils.js";

const rootDir = findRootDir();
const servicesDir = join(rootDir, "services");

interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
}

interface ServiceInfo {
  name: string;
  path: string;
  hasScript: boolean;
}

interface GenerateResult {
  service: string;
  success: boolean;
  error?: string;
}

/**
 * Read package.json from service directory
 */
function readPackageJson(servicePath: string): PackageJson | null {
  const packagePath = join(servicePath, "package.json");

  if (!existsSync(packagePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(packagePath, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Check if service has db:generate script
 */
function hasDbGenerateScript(servicePath: string): boolean {
  const pkg = readPackageJson(servicePath);
  return !!pkg?.scripts?.["db:generate"];
}

/**
 * Discover all services with db:generate script
 */
function discoverServicesWithDbGenerate(): ServiceInfo[] {
  const services: ServiceInfo[] = [];

  for (const name of readdirSync(servicesDir)) {
    const servicePath = join(servicesDir, name);
    if (!statSync(servicePath).isDirectory()) continue;

    const hasScript = hasDbGenerateScript(servicePath);
    services.push({
      name,
      path: servicePath,
      hasScript,
    });
  }

  return services;
}

/**
 * Run db:generate for a specific service
 */
async function generateForService(serviceName: string): Promise<GenerateResult> {
  const servicePath = join(servicesDir, serviceName);

  if (!existsSync(servicePath)) {
    return {
      service: serviceName,
      success: false,
      error: `Service directory not found`,
    };
  }

  if (!hasDbGenerateScript(servicePath)) {
    return {
      service: serviceName,
      success: false,
      error: `No db:generate script in package.json`,
    };
  }

  try {
    await execa("npm", ["run", "db:generate"], {
      cwd: servicePath,
      stdio: "inherit",
    });

    return { service: serviceName, success: true };
  } catch (error: any) {
    return {
      service: serviceName,
      success: false,
      error: error.message || "Unknown error",
    };
  }
}

/**
 * Run db:generate for specific service
 */
export async function runDbGenerate(serviceName: string): Promise<boolean> {
  console.log(chalk.cyan(`\n📦 Generating migrations for ${serviceName}...\n`));

  const result = await generateForService(serviceName);

  if (result.success) {
    console.log(chalk.green(`\n✅ Migrations generated for ${serviceName}`));
    return true;
  } else {
    console.error(chalk.red(`\n❌ ${serviceName}: ${result.error}`));
    return false;
  }
}

/**
 * Run db:generate for all services that have the script
 */
export async function runAllDbGenerate(): Promise<boolean> {
  const services = discoverServicesWithDbGenerate();
  const servicesWithScript = services.filter((s) => s.hasScript);

  if (servicesWithScript.length === 0) {
    console.log(chalk.yellow("\n📋 No services with db:generate script found\n"));
    console.log(chalk.gray("Add a db:generate script to service package.json to enable migration generation"));
    return true;
  }

  console.log(chalk.cyan(`\n📋 Generating migrations for ${servicesWithScript.length} service(s)\n`));

  const results: GenerateResult[] = [];

  for (const service of servicesWithScript) {
    console.log(chalk.gray(`\n${"─".repeat(50)}`));
    console.log(chalk.cyan(`📦 ${service.name}`));
    console.log(chalk.gray(`${"─".repeat(50)}\n`));

    const result = await generateForService(service.name);
    results.push(result);

    if (result.success) {
      console.log(chalk.green(`✅ Done`));
    } else {
      console.error(chalk.red(`❌ ${result.error}`));
    }
  }

  const failed = results.filter((r) => !r.success);
  const succeeded = results.filter((r) => r.success);

  console.log(chalk.gray(`\n${"═".repeat(50)}\n`));

  if (failed.length === 0) {
    console.log(chalk.green(`✅ All ${succeeded.length} service(s) generated migrations successfully`));
    return true;
  } else {
    console.log(chalk.yellow(`⚠️  ${succeeded.length} succeeded, ${failed.length} failed`));
    return false;
  }
}

/**
 * List available services for db:generate
 */
export function listDbGenerateServices(): string[] {
  return discoverServicesWithDbGenerate()
    .filter((s) => s.hasScript)
    .map((s) => s.name);
}

/**
 * List all services and their db:generate status
 */
export function listAllServicesStatus(): ServiceInfo[] {
  return discoverServicesWithDbGenerate();
}
