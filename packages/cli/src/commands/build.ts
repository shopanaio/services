import chalk from "chalk";
import ora from "ora";
import { execa } from "execa";
import { findRootDir } from "../utils.js";
import {
  buildServices,
  printSummary,
} from "../scripts/build-services.js";
import {
  discoverProjectUnits,
  type ProjectUnit,
} from "../project-units.js";

interface BuildOptions {
  service?: string[];
  packages?: boolean;
  parallel?: boolean;
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

async function typeCheck(unitsToCheck: ProjectUnit[]): Promise<boolean> {
  const spinner = ora(`Type checking ${unitsToCheck.length} project unit(s)...`).start();

  const results = await Promise.all(
    unitsToCheck.map((unit) => typeCheckService(unit.name, unit.path))
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
  const allUnits = discoverProjectUnits();
  const allNames = allUnits.map((unit) => unit.name);
  let unitsToProcess = allUnits;

  if (options.service && options.service.length > 0) {
    const invalid = options.service.filter((name) => !allNames.includes(name));
    if (invalid.length > 0) {
      console.error(chalk.red(`\n❌ Unknown project unit(s): ${invalid.join(", ")}`));
      console.error(chalk.gray(`   Available: ${allNames.join(", ")}`));
      process.exit(1);
    }
    unitsToProcess = allUnits.filter((unit) =>
      options.service!.includes(unit.name),
    );

    // apps-service statically imports every bundled App definition.
    if (
      unitsToProcess.some(
        (unit) => unit.kind === "service" && unit.name === "apps",
      )
    ) {
      const selectedNames = new Set(
        unitsToProcess.map((unit) => `${unit.kind}:${unit.name}`),
      );
      for (const app of allUnits.filter((unit) => unit.kind === "app")) {
        if (!selectedNames.has(`app:${app.name}`)) {
          unitsToProcess.push(app);
        }
      }
    }
  }

  // Packages must exist before Apps and services resolve workspace declarations.
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

  if (options.packages) {
    console.log(chalk.green("\n✅ Build complete!\n"));
    return;
  }

  const stages = [
    {
      label: "Apps",
      units: unitsToProcess.filter((unit) => unit.kind === "app"),
    },
    {
      label: "services",
      units: unitsToProcess.filter(
        (unit) => unit.kind === "service" && unit.name !== "bootstrap",
      ),
    },
    {
      label: "bootstrap",
      units: unitsToProcess.filter(
        (unit) => unit.kind === "service" && unit.name === "bootstrap",
      ),
    },
  ];

  for (const stage of stages) {
    if (stage.units.length === 0) continue;

    const passed = await typeCheck(stage.units);
    if (!passed) {
      process.exit(1);
    }

    console.log(
      chalk.gray(
        `\nBuilding ${stage.units.length} ${stage.label}${options.parallel ? " (parallel)" : ""}...`,
      ),
    );
    const results = await buildServices(
      stage.units.map((unit) => unit.name),
      options.parallel,
    );
    printSummary(results);
    if (results.some((result) => !result.success)) {
      process.exit(1);
    }
  }

  console.log(chalk.green("\n✅ Build complete!\n"));
}
