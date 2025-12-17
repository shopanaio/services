import { loadServiceConfig } from "@shopana/shared-service-config";

/**
 * Service configuration using centralized config system
 */
const { config: serviceConfig, vars } = loadServiceConfig("users");

const normalizedVars = vars as Record<string, string | undefined>;
const normalizedConfig = serviceConfig as Record<string, string | undefined>;

const readOptionalConfig = (
  key: string,
  source: "vars" | "config" = "vars"
): string | undefined => {
  const record = source === "vars" ? normalizedVars : normalizedConfig;
  const value = record[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  const stringValue = typeof value === "string" ? value : String(value);
  const trimmed = stringValue.trim();
  return trimmed.length ? trimmed : undefined;
};

const readRequiredConfig = (
  key: string,
  source: "vars" | "config" = "vars"
): string => {
  const value = readOptionalConfig(key, source);
  if (!value) {
    throw new Error(`Missing required configuration value for key: ${key}`);
  }
  return value;
};

export const config = {
  /** HTTP port for GraphQL/API server */
  port: serviceConfig.admin_graphql_port,

  /** Metrics port */
  metricsPort: serviceConfig.metrics_port,

  /** Current environment name */
  environment: readRequiredConfig("environment"),

  /** Log level */
  logLevel: readRequiredConfig("log_level"),

  /** Development flag */
  isDevelopment: readRequiredConfig("environment") === "development",

  /** Service metadata */
  serviceName: "users-service",
  serviceVersion: "1.0.0",

  /** Casdoor configuration */
  casdoor: {
    endpoint: readOptionalConfig("casdoor_endpoint"),
    clientId: readOptionalConfig("casdoor_client_id"),
    clientSecret: readOptionalConfig("casdoor_client_secret"),
    applicationName: readOptionalConfig("casdoor_application_name"),
    organizationName: readOptionalConfig("casdoor_organization_name"),
    certificate: readOptionalConfig("casdoor_certificate"),
  },
} as const;
