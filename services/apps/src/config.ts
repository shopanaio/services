import {
  getServiceConfig,
  buildDatabaseUrl,
  isDevelopment,
} from "@shopana/shared-service-config";

const { service, global } = getServiceConfig("apps");

export const config = {
  /** HTTP port for GraphQL/API server */
  port: service.ports?.admin_graphql,

  /** Database connection URL */
  databaseUrl: service.database ? buildDatabaseUrl(service.database) : "",

  /** Current environment name */
  environment: global.environment,

  /** Mount path for GraphQL endpoint */
  graphqlPath: service.graphql?.path ?? "/graphql",

  /** Application log level */
  logLevel: global.log_level,

  /** Plugin runner settings (shared for all capabilities) */
  pluginTimeoutMs: 3000,
  pluginRetries: 1,
  pluginRateLimit: 10,

  /** Moleculer transporter configuration */
  transporter: global.moleculer_transporter,

  /** Platform gRPC host for context service */
  platformGrpcHost: global.platform_grpc_host,

  /** Metrics port */
  metricsPort: service.ports?.metrics,

  /** Convenience flag for development checks */
  isDevelopment: isDevelopment(global),
} as const;
