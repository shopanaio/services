import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT,
  dbUrl: process.env.DATABASE_URL || 'postgres://localhost:5432/pricing',

  // Apps Service
  appsServiceUrl: process.env.APPS_SERVICE_URL,

  // Kernel settings
  pluginTimeoutMs: Number(process.env.PRICING_PLUGIN_TIMEOUT_MS ?? 3000),
  pluginRetries: Number(process.env.PRICING_PLUGIN_RETRIES ?? 1),
  pluginRateLimit: Number(process.env.PRICING_PLUGIN_RATELIMIT ?? 10),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Development
  isDevelopment: process.env.NODE_ENV === 'development',
} as const;
