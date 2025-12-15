#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { buildCommand } from "./commands/build.js";
import { devCommand } from "./commands/dev.js";

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
