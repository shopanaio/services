#!/usr/bin/env node
import { spawn } from "child_process";
import { existsSync, readdirSync, statSync, watch } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const servicesDir = join(__dirname, "..");

const services = readdirSync(servicesDir).filter((name) => {
  const dir = join(servicesDir, name);
  return statSync(dir).isDirectory() && existsSync(join(dir, "esbuild.js"));
});

// Track rebuild state
const rebuilding = new Map();
let orchestratorProcess = null;
let restartTimeout = null;

async function buildService(service) {
  if (rebuilding.get(service)) return;
  rebuilding.set(service, true);

  console.log(`🔨 ${service}`);

  return new Promise((resolve) => {
    const proc = spawn("node", ["esbuild.js"], {
      cwd: join(servicesDir, service),
      stdio: ["ignore", "ignore", "inherit"],
    });
    proc.on("close", (code) => {
      rebuilding.set(service, false);
      if (code === 0) {
        console.log(`✓ ${service}`);
      } else {
        console.log(`✗ ${service}`);
      }
      resolve(true);
    });
  });
}

function startOrchestrator() {
  if (orchestratorProcess) {
    orchestratorProcess.kill();
  }

  console.log("\n🚀 Starting orchestrator...\n");
  orchestratorProcess = spawn("node", ["dist/main.js"], {
    cwd: __dirname,
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
    startOrchestrator();
  }, 500);
}

// Initial build
console.log("Building all services...\n");
await Promise.all(services.map(buildService));
console.log("\n✓ All services built\n");

// Start orchestrator
startOrchestrator();

// Watch each service
for (const service of services) {
  const srcDir = join(servicesDir, service, "src");

  watch(srcDir, { recursive: true }, async (_event, filename) => {
    if (
      !filename ||
      filename.endsWith(".test.ts") ||
      filename.endsWith(".spec.ts")
    )
      return;
    if (!/\.(ts|js|json)$/.test(filename)) return;

    const built = await buildService(service);
    if (built) scheduleRestart();
  });
}

console.log("👀 Watching for changes...\n");

// Handle shutdown
process.on("SIGINT", () => {
  if (orchestratorProcess) orchestratorProcess.kill();
  process.exit();
});
