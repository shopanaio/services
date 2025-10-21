import { loadServiceConfig } from "@shopana/shared-service-config";

/**
 * Service configuration using centralized config system
 */
const { config: serviceConfig, vars } = loadServiceConfig("checkout");

export const config = {
  /** HTTP port */
  port: serviceConfig.storefront_graphql_port,

  /** Database connection URL */
  databaseUrl: serviceConfig.database_url!,

  /** Current environment */
  environment: vars.environment,

  /** Log level */
  logLevel: vars.log_level,

  /** Moleculer transporter */
  transporter: vars.moleculer_transporter,

  /** Platform gRPC host */
  platformGrpcHost: vars.platform_grpc_host,

  /** Metrics port */
  metricsPort: serviceConfig.metrics_port,

  /** Development flag */
  isDevelopment: vars.environment === "development",
} as const;
