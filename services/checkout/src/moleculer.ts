import "reflect-metadata";
import "dotenv/config";
import { ServiceBroker, LogLevels } from "moleculer";
import CheckoutService from "./service";
import { App } from "./ioc/container";

// Broker configuration for checkout service
const brokerConfig = {
  // Namespace for grouping services
  namespace: "platform",

  // Unique node identifier
  nodeID: "checkout-service",

  // Logging configuration
  logger: {
    type: "Pino",
    options: {
      // Use custom pino logger with pretty formatting
      pino: {
        level: process.env.LOG_LEVEL || "info",
        ...(process.env.NODE_ENV === "development" && {
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:HH:MM:ss.l",
              ignore: "pid,hostname",
              messageFormat: "[MOLECULER] {msg}",
              levelFirst: true,
            },
          },
        }),
      },
    },
  },
  logLevel: "info" as LogLevels,

  // Transport for communication with other services
  // null for development, NATS for production
  transporter: process.env.MOLECULER_TRANSPORTER || "NATS",

  // Caching configuration
  cacher: "Memory",

  // Serialization method
  serializer: "JSON",

  // Request timeout
  requestTimeout: 10 * 1000,

  // Heartbeat settings
  heartbeatInterval: 5,
  heartbeatTimeout: 15,

  // Parameter validation
  validator: true,

  // Metrics configuration with Prometheus reporter
  metrics: {
    enabled: true,
    reporter: [
      {
        type: "Prometheus",
        options: {
          port: parseInt(process.env.METRICS_PORT || "3031"),
          path: "/metrics",
          defaultLabels: (registry: any) => ({
            namespace: "platform",
            nodeID: "checkout-service",
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

// Set broker in App container
App.create(broker);


// Create service
broker.createService(CheckoutService as any);

// Handle graceful shutdown
const shutdown = async () => {
  try {
    broker.logger.info("Stopping Checkout service gracefully...");
    await broker.stop();
    broker.logger.info("Checkout service stopped successfully");
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
      "Checkout service started successfully and ready to serve!"
    );

    // Enable REPL for debugging (development only)
    if (process.env.NODE_ENV === "development") {
      broker.logger.info("REPL enabled for development debugging");
      broker.repl();
    }
  })
  .catch((error) => {
    console.error(error);
    broker.logger.error("Failed to start Checkout service:", );
    process.exit(1);
  });
