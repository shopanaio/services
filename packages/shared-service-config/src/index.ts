/**
 * @shopana/shared-service-config
 *
 * Centralized configuration management for Shopana microservices.
 * Provides unified configuration loading from a single YAML file with:
 * - Zod runtime validation
 * - ENV variable substitution (${ENV_VAR} syntax)
 * - YAML anchors support for DRY configuration
 * - TypeScript type safety
 */

// Export types from schema
export type {
  Config,
  GlobalConfig,
  ServicesConfig,
  ServiceName,
  ServiceConfig,
  BaseService,
  DbConfig,
  S3Config,
  CasdoorConfig,
  WorkflowsConfig,
  PortsConfig,
} from "./schema.js";

// Export schemas for advanced use cases
export {
  ConfigSchema,
  ServiceConfigSchema,
  BaseServiceSchema,
  DbConfigSchema,
  S3ConfigSchema,
  CasdoorConfigSchema,
  WorkflowsConfigSchema,
  PortsConfigSchema,
} from "./schema.js";

// Export configuration loader functions
export {
  getConfig,
  getGlobalConfig,
  getServiceConfig,
  loadServiceConfig, // Legacy export for backwards compatibility
  findWorkspaceRoot,
  clearConfigCache,
} from "./configLoader.js";

// Export helper functions
export {
  buildDbUrl,
  buildDbUrl as buildDatabaseUrl, // Alias for backwards compatibility
  buildS3Config,
  buildS3Config as buildStorageConfig, // Alias for backwards compatibility
  isDevelopment,
  isProduction,
  isStaging,
} from "./helpers.js";
