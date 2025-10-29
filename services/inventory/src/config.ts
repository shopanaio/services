import { loadServiceConfig } from "@shopana/shared-service-config";

/**
 * Service configuration using centralized config system
 */
const { vars } = loadServiceConfig("inventory");

const normalizedVars = vars as Record<string, string | undefined>;

const readOptionalConfig = (key: string): string | undefined => {
  const value = normalizedVars[key];
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const readRequiredConfig = (key: string): string => {
  const value = readOptionalConfig(key);
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

const environment = readRequiredConfig("environment");
const logLevel = readRequiredConfig("log_level");
const transporter = readRequiredConfig("moleculer_transporter");

export const config = {
  /** HTTP port for health check server */
  port: 0,

  /** Database connection URL */
  databaseUrl: "",

  /** Current environment name */
  environment,

  /** Log level */
  logLevel,

  /** Moleculer transporter */
  transporter,

  /** Platform gRPC host */
  platformGrpcHost: readOptionalConfig("platform_grpc_host"),

  /** Plugin settings */
  pluginTimeoutMs: 5000,
  pluginRetries: 2,
  pluginRateLimit: 20,

  /** Development flag */
  isDevelopment: environment === "development",

  /** Service metadata */
  serviceName: "inventory-service",
  serviceVersion: "1.0.0",

  /** Object storage configuration for inventory payloads */
  storage: {
    endpoint: readRequiredConfig("object_storage_endpoint"),
    accessKey: readRequiredConfig("object_storage_access_key"),
    secretKey: readRequiredConfig("object_storage_secret_key"),
    bucket: readRequiredConfig("object_storage_bucket"),
    region: readOptionalConfig("object_storage_region"),
    prefix: readOptionalConfig("object_storage_prefix"),
    pathStyle: parseOptionalBoolean(
      readOptionalConfig("object_storage_path_style")
    ),
    sessionToken: readOptionalConfig("object_storage_session_token"),
  },
} as const;
