#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";
import { buildCommand } from "./commands/build.js";
import { codegenCommand } from "./commands/codegen.js";
import { dbGenerateCommand } from "./commands/db.js";
import { devCommand } from "./commands/dev.js";
import { gatewayCommand } from "./commands/gateway.js";
import { migrateCommand } from "./commands/migrate.js";
import {
  schemaBuildCommand,
  schemaComposeCommand,
  schemaExportCommand,
} from "./commands/schema.js";

const program = new Command();

program.name("shopana").description("Shopana development CLI").version("0.1.0");

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

// DB commands
const db = program.command("db").description("Database management commands");

db.command("generate")
  .description("Generate database migrations from ORM schema")
  .option("-s, --service <service>", "Generate for specific service only")
  .option("-l, --list", "List services with db:generate script")
  .action(dbGenerateCommand);

db.command("migrate")
  .description("Run database migrations")
  .option("-s, --service <service>", "Migrate specific service only")
  .action(migrateCommand);

// Codegen command
program
  .command("codegen")
  .description("Generate GraphQL TypeScript types")
  .option("-s, --service <service>", "Generate for specific service only")
  .action(codegenCommand);

// Gateway command
program
  .command("gateway")
  .description("Start GraphQL federation gateway")
  .option("-a, --admin", "Start admin gateway only")
  .option("-s, --storefront", "Start storefront gateway only")
  .action(gatewayCommand);

// Schema commands
const schema = program.command("schema").description("Manage GraphQL schemas");

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
  console.log(
    chalk.cyan(`
  ███████╗██╗  ██╗ ██████╗ ██████╗  █████╗ ███╗   ██╗ █████╗
  ██╔════╝██║  ██║██╔═══██╗██╔══██╗██╔══██╗████╗  ██║██╔══██╗
  ███████╗███████║██║   ██║██████╔╝███████║██╔██╗ ██║███████║
  ╚════██║██╔══██║██║   ██║██╔═══╝ ██╔══██║██║╚██╗██║██╔══██║
  ███████║██║  ██║╚██████╔╝██║     ██║  ██║██║ ╚████║██║  ██║
  ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝
  `)
  );
  program.help();
}
