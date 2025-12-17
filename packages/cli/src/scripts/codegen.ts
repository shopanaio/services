#!/usr/bin/env tsx

/**
 * GraphQL TypeScript codegen for services
 * Runs graphql-codegen in each service that has codegen.ts
 */

import { execSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { findRootDir } from "../utils.js";

const rootDir = findRootDir();

function findServicesWithCodegen(): string[] {
  const servicesDir = join(rootDir, "services");

  if (!existsSync(servicesDir)) {
    return [];
  }

  return readdirSync(servicesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .filter((dirent) =>
      existsSync(join(servicesDir, dirent.name, "codegen.ts"))
    )
    .map((dirent) => dirent.name);
}

interface CodegenResult {
  service: string;
  success: boolean;
  error?: string;
}

async function runCodegenForService(service: string): Promise<CodegenResult> {
  const servicePath = join(rootDir, "services", service);
  const codegenConfig = join(servicePath, "codegen.ts");

  if (!existsSync(servicePath)) {
    return { service, success: false, error: "service not found" };
  }

  if (!existsSync(codegenConfig)) {
    return { service, success: false, error: "codegen.ts not found" };
  }

  try {
    execSync("npx graphql-codegen", {
      cwd: servicePath,
      stdio: "pipe",
    });

    return { service, success: true };
  } catch (error: any) {
    return {
      service,
      success: false,
      error: error.stderr?.toString().trim() || error.message,
    };
  }
}

export async function runCodegen(targetService?: string) {
  console.log("🔧 Generating GraphQL TypeScript types\n");

  const availableServices = findServicesWithCodegen();

  if (targetService) {
    if (!availableServices.includes(targetService)) {
      console.error(`❌ Unknown service: ${targetService}`);
      console.log(`   Available: ${availableServices.join(", ")}`);
      process.exitCode = 1;
      return;
    }
  }

  const services = targetService ? [targetService] : availableServices;

  let success = 0;
  let failed = 0;

  for (const service of services) {
    const result = await runCodegenForService(service);

    if (result.success) {
      console.log(`✅ ${result.service}`);
      success++;
    } else {
      console.error(`❌ ${result.service}: ${result.error}`);
      failed++;
    }
  }

  console.log(`\n${success} generated, ${failed} failed`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}
