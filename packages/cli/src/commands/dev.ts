import chalk from "chalk";
import { execa } from "execa";
import { findRootDir } from "../utils.js";

interface DevOptions {
  service?: string;
}

export async function devCommand(options: DevOptions) {
  const rootDir = findRootDir();

  console.log(chalk.cyan("\n🚀 Shopana Dev\n"));

  if (options.service) {
    // Run specific service
    console.log(chalk.cyan(`📦 Running ${options.service} service\n`));

    try {
      await execa("yarn", ["workspace", `@shopana/${options.service}-service`, "dev"], {
        cwd: rootDir,
        stdio: "inherit",
      });
    } catch (error) {
      console.log(chalk.yellow(`\n${options.service} service stopped`));
    }
  } else {
    // Run orchestrator (all services)
    console.log(chalk.cyan("📦 Starting orchestrator (all services)\n"));
    console.log(chalk.gray("Services:"));
    console.log(chalk.gray("  • Apps API:      http://localhost:10001/graphql"));
    console.log(chalk.gray("  • Checkout API:  http://localhost:10002/graphql"));
    console.log(chalk.gray("  • Orders API:    http://localhost:10003/graphql"));
    console.log(chalk.gray("  • Metrics:       http://localhost:3030/metrics\n"));

    try {
      await execa("yarn", ["workspace", "@shopana/orchestrator-service", "dev"], {
        cwd: rootDir,
        stdio: "inherit",
      });
    } catch (error) {
      console.log(chalk.yellow("\nOrchestrator stopped"));
    }
  }
}
