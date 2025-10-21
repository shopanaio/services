import { loadServiceConfig } from "@shopana/shared-service-config";

/**
 * Service configuration using centralized config system
 */
const { vars } = loadServiceConfig("inventory");

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
  pluginTimeoutMs: 5000,
  pluginRetries: 2,
  pluginRateLimit: 20,

  /** Development flag */
  isDevelopment: vars.environment === "development",

  /** Service metadata */
  serviceName: "inventory-service",
  serviceVersion: "1.0.0",
} as const;
