import "dotenv/config";

import { ServiceBroker, LogLevels } from "moleculer";
import { loadOrchestratorConfig } from "@shopana/shared-service-config";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import fs from "fs/promises";

/**
 * Find the root directory containing package.json with workspaces
 */
async function findRootDir(startDir: string): Promise<string> {
  let currentDir = path.resolve(startDir);

  while (currentDir !== path.parse(currentDir).root) {
    const packageJsonPath = path.join(currentDir, "package.json");
    try {
      const pkg = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
      if (pkg.workspaces) {
        return currentDir;
      }
    } catch (e) {
      // package.json not found or not readable, continue searching
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached filesystem root
    currentDir = parentDir;
  }

  throw new Error("Could not find project root directory with workspaces");
}

/**
 * Get the path to a service's main file
 */
async function getServicePath(
  serviceName: string,
  environment: string
): Promise<string> {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = await findRootDir(currentDir);

  if (environment === "development") {
    return path.join(projectRoot, "services", serviceName, "src", "service.ts");
  } else {
    return path.join(
      projectRoot,
      "services",
      serviceName,
      "dist",
      "src",
      "service.js"
    );
  }
}

/**
 * Unified Service Orchestrator
 * Runs multiple services in a single process with in-memory communication
 *
 * Configuration is loaded from config.yml orchestrator section:
 * - orchestrator.services: list of services to load
 *
 * Environment variables:
 * - ORCHESTRATOR_TRANSPORTER: "null" for in-memory, "NATS" for distributed
 * - LOG_LEVEL: logging level
 * - METRICS_PORT: Prometheus metrics port
 *
 * Note: checkout and orders services always run standalone
 */
async function startOrchestrator() {
  console.log("🚀 Starting Service Orchestrator...");

  // Load orchestrator configuration from config.yml
  const orchestratorConfig = loadOrchestratorConfig();

  console.log(`🌍 Environment: ${orchestratorConfig.environment}`);
  console.log(`📦 Services to load: ${orchestratorConfig.services.join(", ")}`);
  console.log(
    `🚌 Transporter: ${orchestratorConfig.transporter || "in-memory"}`
  );

  const broker = new ServiceBroker({
    namespace: "platform",
    nodeID: "orchestrator",
    logger: true,
    logLevel: orchestratorConfig.logLevel as LogLevels,

    transporter: orchestratorConfig.transporter,

    cacher: "Memory",
    serializer: "JSON",
    requestTimeout: 10 * 1000,
    validator: true,

    metrics: {
      enabled: true,
      reporter: [
        {
          type: "Prometheus",
          options: {
            port: orchestratorConfig.metricsPort,
            path: "/metrics",
            defaultLabels: () => ({
              namespace: "platform",
              nodeID: "orchestrator",
            }),
          },
        },
      ],
    },

    tracing: false,
  });

  const loadedServices: string[] = [];

  // Load services based on configuration
  for (const serviceName of orchestratorConfig.services) {
    try {
      // Resolve absolute path for the service
      const servicePath = await getServicePath(
        serviceName,
        orchestratorConfig.environment
      );
      const serviceUrl = pathToFileURL(servicePath).href;

      broker.logger.debug(`Loading service from: ${servicePath}`);
      const ServiceModule = await import(serviceUrl);
      const ServiceDefinition = ServiceModule.default;

      broker.createService(ServiceDefinition as any);
      broker.logger.info(`✅ Loaded service: ${serviceName}`);
      loadedServices.push(serviceName);
    } catch (error) {
      broker.logger.error(`❌ Failed to load service ${serviceName}:`, error);
      throw error; // Fail fast on service loading error
    }
  }

  // Handle graceful shutdown
  const shutdown = async () => {
    try {
      broker.logger.info("🛑 Stopping orchestrator...");
      await broker.stop();
      broker.logger.info("✅ Orchestrator stopped gracefully");
      process.exit(0);
    } catch (error) {
      broker.logger.error("❌ Error during shutdown:", error);
      process.exit(1);
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("uncaughtException", (error) => {
    broker.logger.error("💥 Uncaught exception:", error);
    shutdown();
  });

  // Start broker
  await broker.start();

  broker.logger.info("═".repeat(60));
  broker.logger.info("🚀 Service Orchestrator started successfully");
  broker.logger.info("═".repeat(60));
  broker.logger.info(
    `📡 Transport: ${
      orchestratorConfig.transporter ?? "In-memory (zero latency)"
    }`
  );
  broker.logger.info(`🏷️  Namespace: platform`);
  broker.logger.info(
    `📦 Loaded services (${loadedServices.length}): ${loadedServices.join(
      ", "
    )}`
  );
  broker.logger.info(
    `🔧 Config: ${orchestratorConfig.environment} mode from config.yml`
  );
  broker.logger.info("═".repeat(60));

  // Enable REPL for debugging in development
  if (orchestratorConfig.environment === "development") {
    broker.logger.info("🐛 REPL enabled for debugging");
    broker.repl();
  }
}

// Start orchestrator
startOrchestrator().catch((error) => {
  console.error("💥 Failed to start orchestrator:", error);
  process.exit(1);
});
