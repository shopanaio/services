import chalk from "chalk";
import {
  runDbGenerate,
  runAllDbGenerate,
  listDbGenerateServices,
  listAllServicesStatus,
} from "../scripts/db-generate.js";

interface DbGenerateOptions {
  service?: string;
  list?: boolean;
}

export async function dbGenerateCommand(options: DbGenerateOptions) {
  console.log(chalk.cyan("\n🗄️  Database Migration Generation\n"));

  // List mode - show all services and their status
  if (options.list) {
    const services = listAllServicesStatus();

    console.log(chalk.gray("Services with db:generate script:\n"));

    for (const service of services) {
      if (service.hasScript) {
        console.log(chalk.green(`  ✓ ${service.name}`));
      } else {
        console.log(chalk.gray(`  ✗ ${service.name}`));
      }
    }

    console.log();
    return;
  }

  if (options.service) {
    const available = listDbGenerateServices();

    if (!available.includes(options.service)) {
      console.error(chalk.red(`Service "${options.service}" does not have db:generate script\n`));

      if (available.length > 0) {
        console.log(`Available services: ${available.join(", ")}`);
      } else {
        console.log(chalk.gray("No services have db:generate script configured"));
      }

      process.exitCode = 1;
      return;
    }

    const success = await runDbGenerate(options.service);
    if (!success) {
      process.exitCode = 1;
    }
  } else {
    const success = await runAllDbGenerate();
    if (!success) {
      process.exitCode = 1;
    }
  }
}
