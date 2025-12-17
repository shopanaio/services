import {
  getServiceConfig,
  buildDatabaseUrl,
  isDevelopment,
} from "@shopana/shared-service-config";

const { service, global } = getServiceConfig("checkout");

export const config = {
  /** HTTP port */
  port: service.ports?.storefront_graphql,

  /** Database connection URL */
  databaseUrl: service.db ? buildDatabaseUrl(service.db) : "",

  /** Current environment */
  environment: global.environment,

  /** Log level */
  logLevel: global.log_level,

  /** Moleculer transporter */
  transporter: global.moleculer_transporter,

  /** Platform gRPC host */
  platformGrpcHost: global.platform_grpc_host,

  /** Metrics port */
  metricsPort: service.ports?.metrics,

  /** Development flag */
  isDevelopment: isDevelopment(global),

} as const;
