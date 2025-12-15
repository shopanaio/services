import chalk from "chalk";
import { runDev } from "../scripts/dev.js";

interface DevOptions {
  service?: string;
}

export async function devCommand(options: DevOptions) {
  console.log(chalk.cyan("\n🚀 Shopana Dev\n"));

  if (options.service) {
    console.log(chalk.gray(`Starting ${options.service} service...\n`));
  } else {
    console.log(chalk.gray("Starting orchestrator (all services)...\n"));
    console.log(chalk.gray("Services will be available at:"));
    console.log(chalk.gray("  • Apps API:      http://localhost:10001/graphql"));
    console.log(chalk.gray("  • Checkout API:  http://localhost:10002/graphql"));
    console.log(chalk.gray("  • Orders API:    http://localhost:10003/graphql"));
    console.log(chalk.gray("  • Metrics:       http://localhost:3030/metrics\n"));
  }

  await runDev(options.service);
}
