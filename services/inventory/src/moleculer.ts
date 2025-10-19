import "dotenv/config";
import { ServiceBroker, LogLevels } from "moleculer";
import InventoryService from "./service";

// Broker configuration for inventory service
const brokerConfig = {
	// Namespace for grouping services
	namespace: "platform",

	// Unique node identifier
	nodeID: "inventory-service",

	// Logging configuration
	logger: true,
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
	heartbeatTimeout: 60,

	// Parameter validation
	validator: true,

	// Metrics configuration with Prometheus reporter
	metrics: {
		enabled: true,
		reporter: [
			{
				type: "Prometheus",
				options: {
					port: parseInt(process.env.METRICS_PORT || "3033"),
					path: "/metrics",
					defaultLabels: (registry: any) => ({
						namespace: "platform",
						nodeID: "inventory-service",
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
broker.createService(InventoryService as any);

// Handle graceful shutdown
const shutdown = async () => {
	try {
		broker.logger.info("🛑 Stopping Inventory service...");
		await broker.stop();
		broker.logger.info("✅ Inventory service stopped gracefully");
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
		broker.logger.info("🚀 Inventory service started successfully");

		// Enable REPL for debugging (development only)
		if (process.env.NODE_ENV === "development") {
			broker.repl();
		}
	})
	.catch((error) => {
		broker.logger.error("❌ Failed to start Inventory service:", error);
		process.exit(1);
	});
