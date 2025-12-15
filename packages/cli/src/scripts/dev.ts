#!/usr/bin/env tsx

/**
 * Development script with hot reload
 * Watches all services and rebuilds on changes
 */

import { spawn, ChildProcess } from "child_process";
import { existsSync, watch } from "fs";
import { join } from "path";
import { findRootDir } from "../utils.js";
import {
  buildService,
  buildServices,
  discoverServices,
  getServicesDir,
} from "./build-services.js";

const rootDir = findRootDir();
const servicesDir = getServicesDir();

// Find services with build.config.json (exclude bootstrap)
const services = discoverServices().filter(
  (name) =>
    existsSync(join(servicesDir, name, "build.config.json")) &&
    name !== "bootstrap"
);

// Track rebuild state
const rebuilding = new Map<string, boolean>();
let bootstrapProcess: ChildProcess | null = null;
let restartTimeout: NodeJS.Timeout | null = null;

async function rebuildService(service: string): Promise<boolean> {
  if (rebuilding.get(service)) return false;
  rebuilding.set(service, true);

  const result = await buildService(service);

  rebuilding.set(service, false);
  return result.success;
}

function startBootstrap() {
  if (bootstrapProcess) {
    bootstrapProcess.kill();
  }

  console.log("\n🚀 Starting bootstrap...\n");

  const bootstrapDir = join(servicesDir, "bootstrap");
  bootstrapProcess = spawn("node", ["dist/main.js"], {
    cwd: bootstrapDir,
    stdio: "inherit",
  });
}

function scheduleRestart() {
  if (restartTimeout) clearTimeout(restartTimeout);

  restartTimeout = setTimeout(() => {
    // Don't restart if any build is in progress
    for (const [, building] of rebuilding) {
      if (building) {
        scheduleRestart();
        return;
      }
    }
    startBootstrap();
  }, 500);
}

export async function runDev(singleService?: string) {
  if (singleService) {
    // Run single service in dev mode
    console.log(`\n🚀 Starting ${singleService} service\n`);

    const serviceDir = join(servicesDir, singleService);
    const proc = spawn("yarn", ["dev"], {
      cwd: serviceDir,
      stdio: "inherit",
    });

    process.on("SIGINT", () => {
      proc.kill();
      process.exit();
    });

    return;
  }

  // Full bootstrap mode
  console.log("Building all services...\n");

  // Initial build
  await buildServices(services, true);
  await buildService("bootstrap");

  console.log("\n✓ All services built\n");

  // Start bootstrap
  startBootstrap();

  // Watch each service
  for (const service of services) {
    const srcDir = join(servicesDir, service, "src");

    if (!existsSync(srcDir)) continue;

    watch(srcDir, { recursive: true }, async (_event, filename) => {
      if (!filename) return;
      if (filename.endsWith(".test.ts") || filename.endsWith(".spec.ts")) return;
      if (!/\.(ts|js|json|graphql)$/.test(filename)) return;

      const built = await rebuildService(service);
      if (built) scheduleRestart();
    });
  }

  // Watch bootstrap
  const bootstrapSrc = join(servicesDir, "bootstrap", "src");
  watch(bootstrapSrc, { recursive: true }, async (_event, filename) => {
    if (!filename) return;
    if (filename.endsWith(".test.ts") || filename.endsWith(".spec.ts")) return;
    if (!/\.(ts|js|json)$/.test(filename)) return;

    const built = await rebuildService("bootstrap");
    if (built) scheduleRestart();
  });

  console.log("👀 Watching for changes...\n");

  // Handle shutdown
  process.on("SIGINT", () => {
    if (bootstrapProcess) bootstrapProcess.kill();
    process.exit();
  });
}
