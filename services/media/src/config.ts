import { loadServiceConfig } from "@shopana/shared-service-config";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Service configuration using centralized config system
 */
const { config: serviceConfig, vars } = loadServiceConfig("media");

const normalizedVars = vars as unknown as Record<string, string | undefined>;
const normalizedConfig = serviceConfig as unknown as Record<string, string | undefined>;

const readOptionalConfig = (key: string, source: 'vars' | 'config' = 'vars'): string | undefined => {
  const record = source === 'vars' ? normalizedVars : normalizedConfig;
  const value = record[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  const stringValue = typeof value === 'string' ? value : String(value);
  const trimmed = stringValue.trim();
  return trimmed.length ? trimmed : undefined;
};

const readRequiredConfig = (key: string, source: 'vars' | 'config' = 'vars'): string => {
  const value = readOptionalConfig(key, source);
  if (!value) {
    throw new Error(
      `Missing required configuration value for key: ${key}`
    );
  }
  return value;
};

const parseOptionalBoolean = (
  value: string | undefined
): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new Error(
    `Invalid boolean configuration value: ${value}`
  );
};

export const config = {
  /** Database connection string */
  databaseUrl: readRequiredConfig("database_url", "config"),

  /** HTTP port for GraphQL/API server */
  port: serviceConfig.admin_graphql_port,

  /** Metrics port */
  metricsPort: serviceConfig.metrics_port,

  /** Current environment name */
  environment: readRequiredConfig("environment"),

  /** Log level */
  logLevel: readRequiredConfig("log_level"),

  /** Moleculer transporter */
  transporter: vars.moleculer_transporter,

  /** Platform gRPC host */
  platformGrpcHost: readOptionalConfig("platform_grpc_host"),

  /** Development flag */
  isDevelopment: readRequiredConfig("environment") === "development",

  /** Service metadata */
  serviceName: "media-service",
  serviceVersion: "1.0.0",

  /** GraphQL endpoint path */
  graphqlPath: "/graphql/admin",

  /** Migrations folder path (from dist/media.module.js -> ./migrations) */
  migrationsPath: join(__dirname, "migrations"),

  /** Object storage configuration */
  storage: {
    endpoint: readRequiredConfig("object_storage_endpoint", "config"),
    accessKey: readRequiredConfig("object_storage_access_key", "config"),
    secretKey: readRequiredConfig("object_storage_secret_key", "config"),
    bucket: readRequiredConfig("object_storage_bucket", "config"),
    region: readOptionalConfig("object_storage_region", "config"),
    prefix: readOptionalConfig("object_storage_prefix", "config"),
    pathStyle: parseOptionalBoolean(
      readOptionalConfig("object_storage_path_style", "config")
    ),
    sessionToken: readOptionalConfig("object_storage_session_token", "config"),
  },
} as const;
