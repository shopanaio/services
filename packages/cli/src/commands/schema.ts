import chalk from "chalk";
import ora from "ora";
import { execa } from "execa";
import { existsSync } from "fs";
import { join } from "path";
import { findRootDir } from "../utils.js";

interface SchemaOptions {
  output?: string;
}

/**
 * Export subgraph schemas from all services
 */
export async function schemaExportCommand() {
  const rootDir = findRootDir();

  console.log(chalk.cyan("\n📋 Exporting subgraph schemas\n"));

  const spinner = ora("Exporting schemas from services...").start();

  try {
    await execa("yarn", ["workspace", "@shopana/federation", "schema:export"], {
      cwd: rootDir,
      stdio: "pipe",
    });

    spinner.succeed("Subgraph schemas exported to federation/schema/");
  } catch (error: any) {
    spinner.fail("Failed to export schemas");
    console.error(chalk.red(error.stderr || error.message));
    process.exit(1);
  }
}

/**
 * Compose supergraph from subgraph schemas using Hive CLI
 */
export async function schemaComposeCommand(options: SchemaOptions) {
  const rootDir = findRootDir();

  console.log(chalk.cyan("\n🔗 Composing supergraph schema\n"));

  const spinner = ora("Composing supergraph...").start();

  try {
    await execa("yarn", ["workspace", "@shopana/federation", "schema:compose"], {
      cwd: rootDir,
      stdio: "pipe",
    });

    spinner.succeed("Supergraph composed: federation/supergraph.graphql");
  } catch (error: any) {
    spinner.fail("Failed to compose supergraph");
    console.error(chalk.red(error.stderr || error.message));
    process.exit(1);
  }
}

/**
 * Full schema build: export + compose
 */
export async function schemaBuildCommand(options: SchemaOptions) {
  await schemaExportCommand();
  console.log();
  await schemaComposeCommand(options);

  console.log(chalk.green("\n✅ Schema build complete!\n"));
}
