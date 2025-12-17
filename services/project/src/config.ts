import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  getServiceConfig,
  buildDatabaseUrl,
  isDevelopment,
} from "@shopana/shared-service-config";

const __dirname = dirname(fileURLToPath(import.meta.url));

const { service, global } = getServiceConfig("project");

export const config = {
  /** HTTP port for GraphQL/API server */
  port: service.ports?.admin_graphql,

  /** Metrics port */
  metricsPort: service.ports?.metrics,

  /** Database connection URL */
  databaseUrl: service.database ? buildDatabaseUrl(service.database) : "",

  /** Migrations folder path (from dist -> ./migrations) */
  migrationsPath: join(__dirname, "migrations"),

  /** Current environment name */
  environment: global.environment,

  /** Log level */
  logLevel: global.log_level,

  /** Moleculer transporter */
  transporter: global.moleculer_transporter,

  /** Platform gRPC host */
  platformGrpcHost: global.platform_grpc_host,

  /** Development flag */
  isDevelopment: isDevelopment(global),

  /** Service metadata */
  serviceName: "project-service",
  serviceVersion: "1.0.0",
} as const;
