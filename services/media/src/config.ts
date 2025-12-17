import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  getServiceConfig,
  buildDatabaseUrl,
  buildStorageConfig,
  isDevelopment,
} from "@shopana/shared-service-config";

const __dirname = dirname(fileURLToPath(import.meta.url));

const { service, global } = getServiceConfig("media");

const storageConfig = service.s3
  ? buildStorageConfig(service.s3)
  : null;

export const config = {
  /** Database connection string */
  databaseUrl: service.db ? buildDatabaseUrl(service.db) : "",

  /** HTTP port for GraphQL/API server */
  port: service.ports?.admin_graphql,

  /** Metrics port */
  metricsPort: service.ports?.metrics,

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

  /** GraphQL endpoint path */
  graphqlPath: service.graphql?.path ?? "/graphql/admin",

  /** Migrations folder path (from dist/media.module.js -> ./migrations) */
  migrationsPath: join(__dirname, "migrations"),

  /** Object storage configuration */
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
