import chalk from "chalk";
import {
  runMigration,
  runAllMigrations,
  listMigratableServices,
} from "../scripts/migrate.js";

interface MigrateOptions {
  service?: string;
}

export async function migrateCommand(options: MigrateOptions) {
  console.log(chalk.cyan("\n🗄️  Database Migrations\n"));

  if (options.service) {
    const available = listMigratableServices();

    if (!available.includes(options.service)) {
      console.error(
        chalk.red(`Unknown service: ${options.service}\n`)
      );
      console.log(`Available services: ${available.join(", ")}`);
      process.exitCode = 1;
      return;
    }

    const success = await runMigration(options.service);
    if (!success) {
      process.exitCode = 1;
    }
  } else {
    const success = await runAllMigrations();
    if (!success) {
      process.exitCode = 1;
    }
  }
}
