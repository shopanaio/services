import { loadServiceConfig } from "@shopana/shared-service-config";

/**
 * Service configuration using centralized config system
 */
const { config: serviceConfig, vars } = loadServiceConfig("apps");

export const config = {
  /** HTTP port for GraphQL/API server */
  port: serviceConfig.admin_graphql_port,

  /** Database connection URL */
  databaseUrl: serviceConfig.database_url!,

  /** Current environment name */
  environment: vars.environment,

  /** Mount path for GraphQL endpoint */
  graphqlPath: "/graphql",

  /** Application log level */
  logLevel: vars.log_level,

  /**
   * Plugin runner settings (shared for all capabilities)
   */
  pluginTimeoutMs: 3000,
  pluginRetries: 1,
  pluginRateLimit: 10,

  /** Moleculer transporter configuration */
  transporter: vars.moleculer_transporter,

  /** Platform gRPC host for context service */
  platformGrpcHost: vars.platform_grpc_host,

  /** Metrics port */
  metricsPort: serviceConfig.metrics_port,

  /** Convenience flag for development checks */
  isDevelopment: vars.environment === "development",
} as const;
