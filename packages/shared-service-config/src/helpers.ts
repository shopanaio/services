import type { DatabaseConfig, GlobalConfig, StorageConfig } from "./schema.js";

/**
 * Build PostgreSQL connection URL from database configuration
 */
export function buildDatabaseUrl(config: DatabaseConfig): string {
  const { host, port, user, password, database, schema } = config;
  const baseUrl = `postgresql://${user}:${password}@${host}:${port}/${database}`;

  if (schema) {
    return `${baseUrl}?schema=${schema}`;
  }

  return baseUrl;
}

/**
 * Check if environment is development
 */
export function isDevelopment(config: GlobalConfig): boolean {
  return config.environment === "development";
}

/**
 * Check if environment is production
 */
export function isProduction(config: GlobalConfig): boolean {
  return config.environment === "production";
}

/**
 * Check if environment is staging
 */
export function isStaging(config: GlobalConfig): boolean {
  return config.environment === "staging";
}

/**
 * Get S3-compatible storage configuration object
 */
export function buildStorageConfig(config: StorageConfig): {
  endpoint: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  region: string;
  forcePathStyle: boolean;
  bucket: string;
} {
  return {
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.access_key,
      secretAccessKey: config.secret_key,
    },
    region: config.region ?? "us-east-1",
    forcePathStyle: config.path_style ?? false,
    bucket: config.bucket,
  };
}
