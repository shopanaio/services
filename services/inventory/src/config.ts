import { loadServiceConfig } from "@shopana/shared-service-config";

/**
 * Service configuration using centralized config system
 */
const { config: serviceConfig, vars } = loadServiceConfig("inventory");

const normalizedVars = vars as Record<string, string | undefined>;
const normalizedConfig = serviceConfig as Record<string, string | undefined>;

const readOptionalConfig = (key: string, source: 'vars' | 'config' = 'vars'): string | undefined => {
  const record = source === 'vars' ? normalizedVars : normalizedConfig;
  const value = record[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  // Convert to string if needed
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
  /** HTTP port for health check server */
  port: 0,

  /** Database connection URL */
  databaseUrl: "",

  /** Current environment name */
  environment: readRequiredConfig("environment"),

  /** Log level */
  logLevel: readRequiredConfig("log_level"),

  /** Moleculer transporter */
  transporter: vars.moleculer_transporter,

  /** Platform gRPC host */
  platformGrpcHost: readOptionalConfig("platform_grpc_host"),

  /** Plugin settings */
  pluginTimeoutMs: 5000,
  pluginRetries: 2,
  pluginRateLimit: 20,

  /** Development flag */
  isDevelopment: readRequiredConfig("environment") === "development",

  /** Service metadata */
  serviceName: "inventory-service",
  serviceVersion: "1.0.0",

  /** Object storage configuration for inventory payloads */
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
