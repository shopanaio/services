import dotenv from "dotenv";
import { loadServiceConfig } from "@shopana/shared-service-config";

// Load environment variables from .env file
dotenv.config();

/**
 * Service configuration using centralized config system
 */
const serviceConfig = loadServiceConfig("payments");

export const config = {
  /** HTTP port for health check server */
  port: serviceConfig.port,

  /** Database connection URL */
  databaseUrl: serviceConfig.databaseUrl || "",

  /** Current environment name */
  nodeEnv: serviceConfig.environment,

  /** Apps service URL */
  appsServiceUrl: process.env.APPS_SERVICE_URL,

  /** Plugin settings */
  pluginTimeoutMs: Number(process.env.PAYMENTS_PLUGIN_TIMEOUT_MS ?? 3000),
  pluginRetries: Number(process.env.PAYMENTS_PLUGIN_RETRIES ?? 1),
  pluginRateLimit: Number(process.env.PAYMENTS_PLUGIN_RATELIMIT ?? 10),

  /** Logging */
  logLevel: process.env.LOG_LEVEL || "info",

  /** Development flag */
  isDevelopment: serviceConfig.environment === "development",
} as const;
