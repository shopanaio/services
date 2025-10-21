import { ServiceBroker, LogLevels } from "moleculer";
import AppsService from "./service";
import { config } from "@src/config";

// Broker configuration for apps service
const brokerConfig = {
  // Namespace for grouping services
  namespace: "platform",

  // Unique node identifier
  nodeID: "apps-service",

  // Logging configuration
  logger: true,
  logLevel: config.logLevel as LogLevels,

  // Transport for communication with other services
  // null for development, NATS for production
  transporter: config.transporter,

  // Caching configuration
  cacher: "Memory",

  // Serialization method
  serializer: "JSON",

  // Request timeout
  requestTimeout: 10 * 1000,

  // Parameter validation
  validator: true,

  // Metrics configuration with Prometheus reporter
  metrics: {
    enabled: true,
    reporter: [
      {
        type: "Prometheus",
        options: {
          port: config.metricsPort,
          path: "/metrics",
          defaultLabels: (registry: any) => ({
            namespace: "platform",
            nodeID: "apps-service",
          }),
        },
      },
    ],
  },

  // Tracing disabled for simplicity
  tracing: false,
};

// Create and start broker
const broker = new ServiceBroker(brokerConfig);

// Create service
broker.createService(AppsService as any);

// Handle graceful shutdown
const shutdown = async () => {
  try {
    broker.logger.info("🛑 Stopping Apps service...");
    await broker.stop();
    broker.logger.info("✅ Apps service stopped gracefully");
    process.exit(0);
  } catch (error) {
    broker.logger.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Start broker
broker
  .start()
  .then(() => {
    broker.logger.info("🚀 Apps service started successfully");
    broker.logger.info(
      `📡 Transport: ${brokerConfig.transporter || "In-memory"}`
    );
    broker.logger.info(`🏷️  Namespace: ${brokerConfig.namespace}`);
    broker.logger.info(`🆔 Node ID: ${brokerConfig.nodeID}`);

    // Enable REPL for debugging (development only)
    if (config.isDevelopment) {
      broker.repl();
    }
  })
  .catch((error) => {
    broker.logger.error("❌ Failed to start Apps service:", error);
    process.exit(1);
  });
