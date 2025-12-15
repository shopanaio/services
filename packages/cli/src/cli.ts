#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { buildCommand } from "./commands/build.js";
import { devCommand } from "./commands/dev.js";
import { migrateCommand } from "./commands/migrate.js";
import { schemaExportCommand, schemaComposeCommand, schemaBuildCommand } from "./commands/schema.js";

const program = new Command();

program
  .name("shopana")
  .description("Shopana development CLI")
  .version("0.1.0");

// Build commands
program
  .command("build")
  .description("Build packages and services")
  .option("-s, --service <services...>", "Build specific service(s)")
  .option("-p, --packages", "Build only packages")
  .option("--parallel", "Build services in parallel")
  .action(buildCommand);

// Dev command
program
  .command("dev")
  .description("Start development environment (orchestrator)")
  .option("-s, --service <service>", "Run specific service only")
  .action(devCommand);

// Migrate command
program
  .command("migrate")
  .description("Run database migrations")
  .option("-s, --service <service>", "Migrate specific service only")
  .action(migrateCommand);

// Schema commands
const schema = program
  .command("schema")
  .description("Manage GraphQL schemas");

schema
  .command("export")
  .description("Export subgraph schemas from services")
  .action(schemaExportCommand);

schema
  .command("compose")
  .description("Compose supergraph from subgraphs (Hive CLI)")
  .option("-o, --output <file>", "Output file", "apollo/supergraph.graphql")
  .action(schemaComposeCommand);

schema
  .command("build")
  .description("Export + compose (full schema build)")
  .option("-o, --output <file>", "Output file", "apollo/supergraph.graphql")
  .action(schemaBuildCommand);

// Parse and run
program.parse();

// Show help if no command
if (!process.argv.slice(2).length) {
  console.log(chalk.cyan(`
  ███████╗██╗  ██╗ ██████╗ ██████╗  █████╗ ███╗   ██╗ █████╗
  ██╔════╝██║  ██║██╔═══██╗██╔══██╗██╔══██╗████╗  ██║██╔══██╗
  ███████╗███████║██║   ██║██████╔╝███████║██╔██╗ ██║███████║
  ╚════██║██╔══██║██║   ██║██╔═══╝ ██╔══██║██║╚██╗██║██╔══██║
  ███████║██║  ██║╚██████╔╝██║     ██║  ██║██║ ╚████║██║  ██║
  ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝
  `));
  program.help();
}
