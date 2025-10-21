import { loadServiceConfig } from "@shopana/shared-service-config";

/**
 * Service configuration using centralized config system
 */
const { config: serviceConfig, vars } = loadServiceConfig("pricing");

export const config = {
  /** HTTP port for health check server */
  port: 0,

  /** Database connection URL */
  databaseUrl: "",

  /** Current environment name */
  environment: vars.environment,

  /** Log level */
  logLevel: vars.log_level,

  /** Moleculer transporter */
  transporter: vars.moleculer_transporter,

  /** Platform gRPC host */
  platformGrpcHost: vars.platform_grpc_host,

  /** Plugin settings */
  pluginTimeoutMs: 3000,
  pluginRetries: 1,
  pluginRateLimit: 10,

  /** Development flag */
  isDevelopment: vars.environment === "development",
} as const;
