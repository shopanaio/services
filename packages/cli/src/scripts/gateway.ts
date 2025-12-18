#!/usr/bin/env tsx

/**
 * Federation gateway runner
 * Starts GraphQL Hive gateways for admin and/or storefront
 */

import { spawn, ChildProcess } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { parse as parseYaml } from "yaml";
import { findRootDir } from "../utils.js";

type GatewayType = "admin" | "storefront";

interface GatewayConfig {
  admin: { port: number };
  storefront: { port: number };
}

interface Config {
  gateway: GatewayConfig;
}

function loadConfig(): Config {
  const rootDir = findRootDir();
  const configPath = join(rootDir, "config.yml");

  if (!existsSync(configPath)) {
    throw new Error(`config.yml not found at ${configPath}`);
  }

  const content = readFileSync(configPath, "utf-8");
  return parseYaml(content) as Config;
}

function startGateway(
  type: GatewayType,
  port: number,
  federationDir: string
): ChildProcess {
  const supergraphFile = `supergraph-${type}.graphql`;
  const supergraphPath = join(federationDir, supergraphFile);

  if (!existsSync(supergraphPath)) {
    throw new Error(
      `Supergraph not found: ${supergraphPath}\nRun 'yarn build' in infra/federation first`
    );
  }

  console.log(`🚀 Starting ${type} gateway on port ${port}...`);

  const child = spawn(
    "npx",
    ["hive-gateway", "supergraph", supergraphFile, "-p", String(port)],
    {
      cwd: federationDir,
      stdio: "inherit",
      shell: true,
    }
  );

  child.on("error", (err) => {
    console.error(`❌ ${type} gateway error:`, err.message);
  });

  return child;
}

export interface GatewayOptions {
  admin?: boolean;
  storefront?: boolean;
}

export async function runGateway(options: GatewayOptions) {
  const config = loadConfig();
  const rootDir = findRootDir();
  const federationDir = join(rootDir, "infra", "federation");

  // Determine which gateways to start
  const startAdmin = options.admin || (!options.admin && !options.storefront);
  const startStorefront =
    options.storefront || (!options.admin && !options.storefront);

  const processes: ChildProcess[] = [];

  try {
    if (startStorefront) {
      const port = config.gateway.storefront.port;
      processes.push(startGateway("storefront", port, federationDir));
    }

    if (startAdmin) {
      const port = config.gateway.admin.port;
      processes.push(startGateway("admin", port, federationDir));
    }

    // Handle graceful shutdown
    const shutdown = () => {
      console.log("\n🛑 Shutting down gateways...");
      for (const proc of processes) {
        proc.kill("SIGTERM");
      }
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    // Wait for all processes
    await Promise.all(
      processes.map(
        (proc) =>
          new Promise<void>((resolve) => {
            proc.on("exit", () => resolve());
          })
      )
    );
  } catch (error: any) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }
}
