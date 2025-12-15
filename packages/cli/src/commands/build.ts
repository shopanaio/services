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
}

export async function buildCommand(options: BuildOptions) {
  const rootDir = findRootDir();

  console.log(chalk.cyan("\n🔨 Shopana Build\n"));

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
    const allServices = discoverServices();

    // Validate requested services
    let servicesToBuild = allServices;

    if (options.service && options.service.length > 0) {
      const invalid = options.service.filter((s) => !allServices.includes(s));
      if (invalid.length > 0) {
        console.error(chalk.red(`\n❌ Unknown service(s): ${invalid.join(", ")}`));
        console.error(chalk.gray(`   Available: ${allServices.join(", ")}`));
        process.exit(1);
      }
      servicesToBuild = options.service;
    }

    console.log(
      chalk.gray(`\nBuilding ${servicesToBuild.length} service(s)${options.parallel ? " (parallel)" : ""}...`)
    );

    const results = await buildServices(servicesToBuild, options.parallel);

    printSummary(results);

    const failed = results.filter((r) => !r.success);
    if (failed.length > 0) {
      process.exit(1);
    }
  }

  console.log(chalk.green("\n✅ Build complete!\n"));
}
