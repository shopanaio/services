import { ServiceBroker, LogLevels } from "moleculer";
import MediaService from "./service.js";
import { config } from "./config.js";

// Broker configuration for media service
const brokerConfig = {
  // Namespace for grouping services
  namespace: "platform",

  // Unique node identifier
  nodeID: "media-service",

  // Logging configuration
  logger: true,
  logLevel: config.logLevel as LogLevels,

  // Transport for communication with other services
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
            nodeID: "media-service",
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
broker.createService(MediaService as any);

// Handle graceful shutdown
const shutdown = async () => {
  try {
    broker.logger.info("🛑 Stopping Media service...");
    await broker.stop();
    broker.logger.info("✅ Media service stopped gracefully");
    process.exit(0);
  } catch (error) {
    broker.logger.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Start broker
broker.start()
  .then(() => {
    broker.logger.info("🚀 Media service started successfully");

    // Enable REPL for debugging (development only)
    if (config.isDevelopment) {
      broker.repl();
    }
  })
  .catch((error) => {
    broker.logger.error("❌ Failed to start Media service:", error);
    process.exit(1);
  });
