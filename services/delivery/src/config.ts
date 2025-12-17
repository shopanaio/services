import { getServiceConfig, isDevelopment } from "@shopana/shared-service-config";

const { global } = getServiceConfig("delivery");

export const config = {
  /** HTTP port for health check server */
  port: 0,

  /** Current environment name */
  environment: global.environment,

  /** Log level */
  logLevel: global.log_level,

  /** Moleculer transporter */
  transporter: global.moleculer_transporter,

  /** Platform gRPC host */
  platformGrpcHost: global.platform_grpc_host,

  /** Plugin settings */
  pluginTimeoutMs: 3000,
  pluginRetries: 1,
  pluginRateLimit: 10,

  /** Development flag */
  isDevelopment: isDevelopment(global),

} as const;
