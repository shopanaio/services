import chalk from "chalk";
import ora from "ora";
import { execa } from "execa";
import { findRootDir } from "../utils.js";
import {
  buildServices,
  discoverServices,
  getServicesDir,
  printSummary,
} from "../scripts/build-services.js";
import { existsSync } from "fs";
import { join } from "path";

interface BuildOptions {
  service?: string[];
  packages?: boolean;
  parallel?: boolean;
  check?: boolean;
}

async function typeCheckService(serviceName: string, servicePath: string): Promise<{ name: string; success: boolean; errors?: string }> {
  try {
    await execa("npx", ["tsc", "--noEmit"], {
      cwd: servicePath,
      stdio: "pipe",
    });
    return { name: serviceName, success: true };
  } catch (error: any) {
    const errors = error.stdout || error.stderr || error.message;
    return { name: serviceName, success: false, errors };
  }
}

async function typeCheck(rootDir: string, servicesToCheck: string[]): Promise<boolean> {
  const spinner = ora(`Type checking ${servicesToCheck.length} service(s)...`).start();
  const servicesDir = getServicesDir();

  const results = await Promise.all(
    servicesToCheck.map(name => typeCheckService(name, join(servicesDir, name)))
  );

  const failed = results.filter(r => !r.success);

  if (failed.length === 0) {
    spinner.succeed("Type check passed");
    return true;
  }

  spinner.fail(`Type check failed for ${failed.length} service(s)`);
  for (const result of failed) {
    console.error(chalk.red(`\n❌ ${result.name}:`));
    if (result.errors) {
      console.error(chalk.gray(result.errors));
    }
  }
  return false;
}

export async function buildCommand(options: BuildOptions) {
  const rootDir = findRootDir();

  console.log(chalk.cyan("\n🔨 Shopana Build\n"));

  // Determine services to process
  const allServices = discoverServices();
  let servicesToProcess = allServices;

  if (options.service && options.service.length > 0) {
    const invalid = options.service.filter((s) => !allServices.includes(s));
    if (invalid.length > 0) {
      console.error(chalk.red(`\n❌ Unknown service(s): ${invalid.join(", ")}`));
      console.error(chalk.gray(`   Available: ${allServices.join(", ")}`));
      process.exit(1);
    }
    servicesToProcess = options.service;
  }

  // Type check first (unless --no-check or packages-only build)
  if (options.check !== false && !options.packages) {
    const passed = await typeCheck(rootDir, servicesToProcess);
    if (!passed) {
      process.exit(1);
    }
  }

  // Build packages first (unless only services requested)
  if (!options.service || options.packages) {
    const packagesSpinner = ora("Building packages...").start();

    try {
      await execa("node", ["packages/esbuild.js"], {
        cwd: rootDir,
        stdio: "pipe",
      });
      packagesSpinner.succeed("Packages built");
    } catch (error) {
      packagesSpinner.fail("Packages build failed");
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  }

  // Build services
  if (!options.packages) {
    console.log(
      chalk.gray(`\nBuilding ${servicesToProcess.length} service(s)${options.parallel ? " (parallel)" : ""}...`)
    );

    const results = await buildServices(servicesToProcess, options.parallel);

    printSummary(results);

    const failed = results.filter((r) => !r.success);
    if (failed.length > 0) {
      process.exit(1);
    }
  }

  console.log(chalk.green("\n✅ Build complete!\n"));
}
