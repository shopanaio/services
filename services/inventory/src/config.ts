import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  getServiceConfig,
  buildDatabaseUrl,
  buildStorageConfig,
  isDevelopment,
} from "@shopana/shared-service-config";

const __dirname = dirname(fileURLToPath(import.meta.url));

const { service, global } = getServiceConfig("inventory");

const storageConfig = service.s3
  ? buildStorageConfig(service.s3)
  : null;

export const config = {
  /** HTTP port for GraphQL/API server */
  port: service.ports?.admin_graphql,

  /** Metrics port */
  metricsPort: service.ports?.metrics,

  /** Database connection URL */
  databaseUrl: service.db ? buildDatabaseUrl(service.db) : "",

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

  /** Plugin settings */
  pluginTimeoutMs: 5000,
  pluginRetries: 2,
  pluginRateLimit: 20,

  /** Development flag */
  isDevelopment: isDevelopment(global),

  /** Service metadata */
  serviceName: "inventory-service",
  serviceVersion: "1.0.0",

  /** Object storage configuration for inventory payloads */
  storage: storageConfig
    ? {
        endpoint: storageConfig.endpoint,
        accessKey: storageConfig.credentials.accessKeyId,
        secretKey: storageConfig.credentials.secretAccessKey,
        bucket: storageConfig.bucket,
        region: storageConfig.region,
        pathStyle: storageConfig.forcePathStyle,
      }
    : null,
} as const;
