import chalk from "chalk";
import {
  exportSchemas,
  composeSupergraph,
  buildSchemas,
} from "../scripts/schema.js";

interface SchemaOptions {
  output?: string;
}

export async function schemaExportCommand() {
  console.log(chalk.cyan("\n📋 Schema Export\n"));
  await exportSchemas();
}

export async function schemaComposeCommand(_options: SchemaOptions) {
  console.log(chalk.cyan("\n🔗 Schema Compose\n"));
  await composeSupergraph();
}

export async function schemaBuildCommand(_options: SchemaOptions) {
  console.log(chalk.cyan("\n🔨 Schema Build\n"));
  await buildSchemas();
}
