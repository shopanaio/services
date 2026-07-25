import chalk from "chalk";
import {
  runMigration,
  runAllMigrations,
  listMigratableServices,
  listMigratableApps,
} from "../scripts/migrate.js";

interface MigrateOptions {
  service?: string;
  app?: string;
}

export async function migrateCommand(options: MigrateOptions) {
  console.log(chalk.cyan("\n🗄️  Database Migrations\n"));

  if (options.service && options.app) {
    console.error(chalk.red("Choose either --service or --app"));
    process.exitCode = 1;
    return;
  }

  if (options.service || options.app) {
    const kind = options.app ? "app" : "service";
    const name = options.app ?? options.service!;
    const available =
      kind === "app" ? listMigratableApps() : listMigratableServices();

    if (!available.includes(name)) {
      console.error(
        chalk.red(`Unknown ${kind}: ${name}\n`)
      );
      console.log(`Available ${kind}s: ${available.join(", ")}`);
      process.exitCode = 1;
      return;
    }

    const success = await runMigration(name, kind);
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
