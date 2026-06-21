import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import net from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const e2eDir = resolve(__dirname, "..");
const rootDir = resolve(e2eDir, "..");
const adminDir = join(rootDir, "admin");
const federationDir = join(rootDir, "infra", "federation");
const dockerComposeFile = join(e2eDir, "docker-compose.infra.yml");
const configFile = process.env.E2E_CONFIG_FILE || process.env.CONFIG_FILE || "config.e2e.yml";
const configPath = join(rootDir, configFile);
const tmpDir = join(rootDir, ".tmp", "e2e");

const adminPort = Number(process.env.E2E_ADMIN_PORT || 3300);
const adminGatewayPort = Number(process.env.E2E_ADMIN_GATEWAY_PORT || 14001);
const storefrontGatewayPort = Number(process.env.E2E_STOREFRONT_GATEWAY_PORT || 14000);
const startDocker = process.env.E2E_START_DOCKER !== "false";
const runMigrations = process.env.E2E_RUN_MIGRATIONS !== "false";

const children = [];
let ready = false;
let shuttingDown = false;

function appendNodeOption(option) {
  const current = process.env.NODE_OPTIONS ?? "";
  return current.split(/\s+/).includes(option)
    ? current
    : [current, option].filter(Boolean).join(" ");
}

const baseEnv = {
  ...process.env,
  CONFIG_FILE: configFile,
  NODE_OPTIONS: appendNodeOption("--experimental-transform-types"),
};

function readConfig() {
  if (!existsSync(configPath)) {
    throw new Error(`E2E config not found: ${configPath}`);
  }

  return yaml.load(readFileSync(configPath, "utf8"));
}

function servicePorts(config) {
  const ports = [];

  for (const service of Object.values(config.services ?? {})) {
    if (service?.ports?.admin_graphql) {
      ports.push(service.ports.admin_graphql);
    }
    if (service?.ports?.storefront_graphql) {
      ports.push(service.ports.storefront_graphql);
    }
  }

  return ports;
}

function firstDbPort(config) {
  for (const service of Object.values(config.services ?? {})) {
    if (service?.db?.port) {
      return Number(service.db.port);
    }
  }

  return Number(config.shared?.db?.default?.port ?? 15432);
}

function databaseUrl(config) {
  for (const service of Object.values(config.services ?? {})) {
    if (service?.db) {
      const { host, port, user, password, database } = service.db;
      return `postgresql://${user}:${password}@${host}:${port}/${database}`;
    }
  }

  const db = config.shared?.db?.default;
  if (db) {
    return `postgresql://${db.user}:${db.password}@${db.host}:${db.port}/${db.database}`;
  }

  return "postgresql://postgres:postgres@localhost:15432/portal";
}

function firstS3Port(config) {
  for (const service of Object.values(config.services ?? {})) {
    const endpoint = service?.s3?.endpoint ?? config.shared?.s3?.default?.endpoint;

    if (typeof endpoint === "string") {
      const url = new URL(endpoint);
      return Number(url.port || (url.protocol === "https:" ? 443 : 80));
    }
  }

  return 19000;
}

function runStep(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? rootDir,
    env: options.env ?? baseEnv,
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}`);
  }
}

function start(name, command, args, options = {}) {
  console.log(`[e2e-env] starting ${name}`);

  const child = spawn(command, args, {
    cwd: options.cwd ?? rootDir,
    env: options.env ?? baseEnv,
    stdio: "inherit",
    shell: false,
  });

  child.on("exit", (code, signal) => {
    if (!ready) {
      console.error(`[e2e-env] ${name} exited before startup completed (${signal ?? code})`);
      shutdown(1);
      return;
    }

    console.error(`[e2e-env] ${name} exited (${signal ?? code})`);
    shutdown(1);
  });

  children.push({ name, child });
  return child;
}

function isTcpOpen(port, host = "127.0.0.1") {
  return new Promise((resolveOpen) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.end();
      resolveOpen(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolveOpen(false);
    });
    socket.once("error", () => {
      resolveOpen(false);
    });
  });
}

async function waitForPort(port, label, timeoutMs = 180000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await isTcpOpen(port)) {
      console.log(`[e2e-env] ${label} is listening on ${port}`);
      return;
    }

    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 1000));
  }

  throw new Error(`${label} did not start listening on port ${port}`);
}

async function waitForPorts(ports, label) {
  for (const port of ports) {
    await waitForPort(port, `${label}:${port}`);
  }
}

function stopDocker() {
  if (!startDocker) {
    return;
  }

  spawnSync(
    "docker",
    ["compose", "-p", "shopana-e2e", "-f", dockerComposeFile, "down"],
    {
      cwd: rootDir,
      env: baseEnv,
      stdio: "inherit",
      shell: false,
    },
  );
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const { child } of [...children].reverse()) {
    if (!child.pid) {
      continue;
    }

    try {
      child.kill("SIGTERM");
    } catch {
      // Process is already gone.
    }
  }

  setTimeout(() => {
    for (const { child } of [...children].reverse()) {
      if (!child.pid || child.exitCode !== null || child.signalCode !== null) {
        continue;
      }

      try {
        child.kill("SIGKILL");
      } catch {
        // Process is already gone.
      }
    }
  }, 5000).unref();

  stopDocker();
  process.exit(exitCode);
}

async function main() {
  const config = readConfig();
  mkdirSync(tmpDir, { recursive: true });

  const adminSupergraph = join(tmpDir, "supergraph-admin.graphql");
  const storefrontSupergraph = join(tmpDir, "supergraph-storefront.graphql");

  if (!existsSync(join(federationDir, "schema"))) {
    runStep("yarn", ["shopana", "schema", "export"]);
  }

  runStep("yarn", ["mesh-compose", "-c", "mesh-admin.config.ts", "-o", adminSupergraph], {
    cwd: federationDir,
  });
  runStep(
    "yarn",
    ["mesh-compose", "-c", "mesh-storefront.config.ts", "-o", storefrontSupergraph],
    { cwd: federationDir },
  );

  if (startDocker) {
    runStep("docker", [
      "compose",
      "-p",
      "shopana-e2e",
      "-f",
      dockerComposeFile,
      "down",
      "--remove-orphans",
    ]);
    runStep("docker", [
      "compose",
      "-p",
      "shopana-e2e",
      "-f",
      dockerComposeFile,
      "up",
      "-d",
      "postgres",
      "minio",
      "minio-init",
    ]);
    await waitForPort(firstDbPort(config), "postgres");
    await waitForPort(firstS3Port(config), "minio");
  }

  if (runMigrations) {
    runStep("yarn", ["shopana", "db", "migrate"], {
      env: {
        ...baseEnv,
        DATABASE_URL: databaseUrl(config),
      },
    });
  }

  start("services", "yarn", ["shopana", "dev"]);
  await waitForPorts(servicePorts(config), "service");

  start(
    "admin gateway",
    "yarn",
    [
      "hive-gateway",
      "supergraph",
      adminSupergraph,
      "-p",
      String(adminGatewayPort),
      "-c",
      "gateway.config.ts",
    ],
    { cwd: federationDir },
  );
  start(
    "storefront gateway",
    "yarn",
    [
      "hive-gateway",
      "supergraph",
      storefrontSupergraph,
      "-p",
      String(storefrontGatewayPort),
      "-c",
      "gateway.config.ts",
    ],
    { cwd: federationDir },
  );

  await waitForPort(adminGatewayPort, "admin gateway");
  await waitForPort(storefrontGatewayPort, "storefront gateway");

  start("admin UI", "yarn", ["dev", "--port", String(adminPort)], {
    cwd: adminDir,
    env: {
      ...baseEnv,
      NEXT_PUBLIC_GRAPHQL_ENDPOINT: `http://127.0.0.1:${adminGatewayPort}/graphql`,
    },
  });
  await waitForPort(adminPort, "admin UI");

  ready = true;
  console.log("[e2e-env] ready");

  await new Promise(() => {});
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("SIGHUP", () => shutdown(0));
process.on("uncaughtException", (error) => {
  console.error(error);
  shutdown(1);
});
process.on("unhandledRejection", (error) => {
  console.error(error);
  shutdown(1);
});

setInterval(() => {
  if (process.ppid === 1) {
    shutdown(1);
  }
}, 1000).unref();

main().catch((error) => {
  console.error(`[e2e-env] ${error instanceof Error ? error.message : String(error)}`);
  shutdown(1);
});
