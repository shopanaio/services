import dotenv from "dotenv";
import { loadServiceConfig } from "@shopana/shared-service-config";

// Load environment variables from .env file
dotenv.config();

/**
 * Service configuration using centralized config system augmented with
 * runtime environment variables for plugin runner and Moleculer settings.
 */
const serviceConfig = loadServiceConfig("apps");

export const config = {
  /** HTTP port for GraphQL/API server */
  port: serviceConfig.port,

  /** Database connection URL */
  databaseUrl: serviceConfig.databaseUrl || "",

  /** Current environment name */
  nodeEnv: serviceConfig.environment,

  /** Mount path for GraphQL endpoint */
  graphqlPath: "/graphql",

  /** Application log level */
  logLevel: process.env.LOG_LEVEL || "info",

  /**
   * Plugin runner settings (shared for all capabilities)
   */
  pluginTimeoutMs: Number(process.env.APPS_PLUGIN_TIMEOUT_MS ?? 3000),
  pluginRetries: Number(process.env.APPS_PLUGIN_RETRIES ?? 1),
  pluginRateLimit: Number(process.env.APPS_PLUGIN_RATELIMIT ?? 10),

  /** Moleculer transporter configuration */
  transporter: process.env.MOLECULER_TRANSPORTER || "NATS",

  /** Platform gRPC host for context service */
  platformGrpcHost: process.env.PLATFORM_GRPC_HOST || "localhost:50051",

  /** Convenience flag for development checks */
  isDevelopment: serviceConfig.environment === "development",
} as const;
