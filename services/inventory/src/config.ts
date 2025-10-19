import dotenv from "dotenv";
import { loadServiceConfig } from "@shopana/shared-service-config";

// Load environment variables from .env file
dotenv.config();

/**
 * Service configuration using centralized config system
 */
const serviceConfig = loadServiceConfig("inventory");

export const config = {
  /** HTTP port for health check server */
  port: serviceConfig.port,

  /** Database connection URL */
  databaseUrl: serviceConfig.databaseUrl || "",

  /** Current environment name */
  nodeEnv: serviceConfig.environment,

  // Apps service (slots)
  appsServiceUrl: process.env.APPS_SERVICE_URL || "http://localhost:4006",

  // Plugin settings
  pluginTimeoutMs: Number(process.env.INVENTORY_PLUGIN_TIMEOUT_MS ?? 5000),
  pluginRetries: Number(process.env.INVENTORY_PLUGIN_RETRIES ?? 2),
  pluginRateLimit: Number(process.env.INVENTORY_PLUGIN_RATELIMIT ?? 20),

  // Logging
  logLevel: process.env.LOG_LEVEL || "info",

  // Development
  isDevelopment: serviceConfig.environment === "development",

  serviceName: "inventory-service",
  serviceVersion: process.env.SERVICE_VERSION || "1.0.0",
} as const;
