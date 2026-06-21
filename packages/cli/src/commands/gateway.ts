import chalk from "chalk";
import { runGateway, GatewayOptions } from "../scripts/gateway.js";
import { findRootDir } from "../utils.js";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { parse as parseYaml } from "yaml";

interface Config {
  gateway: {
    admin: { port: number };
    storefront: { port: number };
  };
}

function loadConfig(): Config {
  const rootDir = findRootDir();
  const configFile = process.env.CONFIG_FILE || "config.yml";
  const configPath = join(rootDir, configFile);
  const content = readFileSync(configPath, "utf-8");
  return parseYaml(content) as Config;
}

export async function gatewayCommand(options: GatewayOptions) {
  console.log(chalk.cyan("\n🌐 GraphQL Gateway\n"));

  const config = loadConfig();
  const rootDir = findRootDir();
  const federationDir = join(rootDir, "infra", "federation");

  // Determine which gateways will start
  const startAdmin = options.admin || (!options.admin && !options.storefront);
  const startStorefront =
    options.storefront || (!options.admin && !options.storefront);

  // Check supergraph files exist
  if (startStorefront) {
    const path = join(federationDir, "supergraph-storefront.graphql");
    if (!existsSync(path)) {
      console.log(chalk.red(`❌ Supergraph not found: supergraph-storefront.graphql`));
      console.log(chalk.gray(`   Run: cd infra/federation && yarn build\n`));
      process.exit(1);
    }
  }

  if (startAdmin) {
    const path = join(federationDir, "supergraph-admin.graphql");
    if (!existsSync(path)) {
      console.log(chalk.red(`❌ Supergraph not found: supergraph-admin.graphql`));
      console.log(chalk.gray(`   Run: cd infra/federation && yarn build\n`));
      process.exit(1);
    }
  }

  console.log(chalk.gray("Gateways:"));
  if (startStorefront) {
    const port = config.gateway.storefront.port;
    console.log(chalk.gray(`  • Storefront: http://localhost:${port}/graphql`));
  }
  if (startAdmin) {
    const port = config.gateway.admin.port;
    console.log(chalk.gray(`  • Admin:      http://localhost:${port}/graphql`));
  }
  console.log();

  await runGateway(options);
}
