import chalk from "chalk";
import ora from "ora";
import { execa } from "execa";
import { findRootDir } from "../utils.js";

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
    const args = ["scripts/build-services.js"];

    if (options.service && options.service.length > 0) {
      for (const s of options.service) {
        args.push("-s", s);
      }
    }

    if (options.parallel) {
      args.push("--parallel");
    }

    const servicesSpinner = ora("Building services...").start();

    try {
      const result = await execa("node", args, {
        cwd: rootDir,
        stdio: "pipe",
      });

      servicesSpinner.succeed("Services built");

      // Show summary
      const lines = result.stdout.split("\n");
      const summaryStart = lines.findIndex((l) => l.includes("Built") && l.includes("service"));
      if (summaryStart !== -1) {
        console.log(chalk.gray(lines.slice(summaryStart).join("\n")));
      }
    } catch (error) {
      servicesSpinner.fail("Services build failed");
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  }

  console.log(chalk.green("\n✅ Build complete!\n"));
}
