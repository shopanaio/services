import { ServiceBroker, LogLevels } from "moleculer";
import PaymentsService from "./service";
import { config } from "./config";

// Broker configuration for payments service
const brokerConfig = {
  // Namespace for grouping services
  namespace: "platform",

  // Unique node identifier
  nodeID: "payments-service",

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
          port: config.port,
          path: "/metrics",
          defaultLabels: (registry: any) => ({
            namespace: "platform",
            nodeID: "payment-service",
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
broker.createService(PaymentsService as any);

// Handle graceful shutdown
const shutdown = async () => {
  try {
    broker.logger.info("Stopping Payments service gracefully...");
    await broker.stop();
    broker.logger.info("Payments service stopped successfully");
    process.exit(0);
  } catch (error) {
    broker.logger.error("Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Start broker
broker
  .start()
  .then(() => {
    broker.logger.info(
      "Payments service started successfully and ready to serve!"
    );

    // Enable REPL for debugging (development only)
    if (config.isDevelopment) {
      broker.logger.info("REPL enabled for development debugging");
      broker.repl();
    }
  })
  .catch((error) => {
    broker.logger.error("Failed to start Payments service:", error);
    process.exit(1);
  });
