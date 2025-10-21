import { loadServiceConfig } from "@shopana/shared-service-config";

/**
 * Service configuration using centralized config system
 */
const { vars } = loadServiceConfig("delivery");

export const config = {
  /** HTTP port for health check server */
  port: 0,

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
