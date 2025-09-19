import dotenv from "dotenv";

dotenv.config();

export const config = {
  // Apps service (slots)
  appsServiceUrl: process.env.APPS_SERVICE_URL || "http://localhost:4006",

  // Plugin settings
  pluginTimeoutMs: Number(process.env.INVENTORY_PLUGIN_TIMEOUT_MS ?? 5000),
  pluginRetries: Number(process.env.INVENTORY_PLUGIN_RETRIES ?? 2),
  pluginRateLimit: Number(process.env.INVENTORY_PLUGIN_RATELIMIT ?? 20),

  // Logging
  logLevel: process.env.LOG_LEVEL || "info",

  // Development
  isDevelopment: process.env.NODE_ENV === "development",

  serviceName: "inventory-service",
  serviceVersion: process.env.SERVICE_VERSION || "1.0.0",
} as const;
