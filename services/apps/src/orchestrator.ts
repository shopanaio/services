import "dotenv/config";
import { ServiceBroker, LogLevels } from "moleculer";
import { loadOrchestratorConfig } from "@shopana/shared-service-config";
import { config } from "@src/config";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

// Import service definitions
import AppsService from "./service";

/**
 * Services registry for dynamic loading
 */
const SERVICES_REGISTRY = {
  platform: {
    path: "../../platform/src/service.ts",
  },
  payments: {
    path: "../../payments/src/service.ts",
  },
  inventory: {
    path: "../../inventory/src/service.ts",
  },
  pricing: {
    path: "../../pricing/src/service.ts",
  },
  delivery: {
    path: "../../delivery/src/service.ts",
  },
  checkout: {
    path: "../../checkout/src/service.ts",
  },
  orders: {
    path: "../../orders/src/service.ts",
  },
} as const;

/**
 * Unified Service Orchestrator
 * Runs multiple services in a single process with in-memory communication
 *
 * Configuration is loaded from config.yml orchestrator section.
 * Can be overridden with environment variables:
 * - SERVICES_MODE: "standalone" | "orchestrator"
 * - ORCHESTRATOR_SERVICES: "platform,payments,inventory" (comma-separated)
 */
async function startOrchestrator() {
  console.log("🚀 Starting Service Orchestrator...");

  // Load orchestrator configuration from config.yml
  const orchestratorConfig = loadOrchestratorConfig();

  console.log(`📋 Mode: ${orchestratorConfig.mode}`);
  console.log(`🌍 Environment: ${orchestratorConfig.environment}`);
  console.log(`📦 Services to load: ${orchestratorConfig.services.join(", ")}`);

  const broker = new ServiceBroker({
    namespace: "platform",
    nodeID: "orchestrator",
    logger: true,
    logLevel: config.logLevel as LogLevels,

    // null = in-memory communication (no NATS required)
    transporter: null,

    cacher: "Memory",
    serializer: "JSON",
    requestTimeout: 10 * 1000,
    validator: true,

    metrics: {
      enabled: true,
      reporter: [{
        type: "Prometheus",
        options: {
          port: parseInt(process.env.METRICS_PORT || "3030"),
          path: "/metrics",
          defaultLabels: () => ({
            namespace: "platform",
            nodeID: "orchestrator",
          }),
        },
      }],
    },

    tracing: false,
  });

  const loadedServices: string[] = [];

  // Load services based on configuration
  for (const serviceName of orchestratorConfig.services) {
    try {
      if (serviceName === "apps") {
        // Always load apps service from current module
        broker.createService(AppsService as any);
        broker.logger.info(`✅ Loaded service: apps`);
        loadedServices.push("apps");
      } else {
        // Dynamically load other services
        const serviceConfig = SERVICES_REGISTRY[serviceName as keyof typeof SERVICES_REGISTRY];
        if (!serviceConfig) {
          broker.logger.warn(`⚠️  Unknown service: ${serviceName}, skipping`);
          continue;
        }

        // Resolve absolute path for the service
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const servicePath = path.resolve(__dirname, serviceConfig.path);
        const serviceUrl = pathToFileURL(servicePath).href;

        broker.logger.debug(`Loading service from: ${servicePath}`);

        const ServiceModule = await import(serviceUrl);
        const ServiceDefinition = ServiceModule.default;

        broker.createService(ServiceDefinition as any);
        broker.logger.info(`✅ Loaded service: ${serviceName}`);
        loadedServices.push(serviceName);
      }
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
  broker.logger.info(`📡 Transport: In-memory (zero latency)`);
  broker.logger.info(`🏷️  Namespace: platform`);
  broker.logger.info(`📦 Loaded services (${loadedServices.length}): ${loadedServices.join(", ")}`);
  broker.logger.info(`🔧 Config: ${orchestratorConfig.environment} mode from config.yml`);
  broker.logger.info("═".repeat(60));

  // Enable REPL for debugging in development
  if (process.env.NODE_ENV === "development") {
    broker.logger.info("🐛 REPL enabled for debugging");
    broker.repl();
  }
}

// Start orchestrator
startOrchestrator().catch((error) => {
  console.error("💥 Failed to start orchestrator:", error);
  process.exit(1);
});
