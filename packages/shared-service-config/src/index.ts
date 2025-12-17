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
  DatabaseConfig,
  StorageConfig,
  CasdoorConfig,
  PortsConfig,
  GraphQLConfig,
  AppsConfig,
  CheckoutConfig,
  DeliveryConfig,
  InventoryConfig,
  MediaConfig,
  OrdersConfig,
  PaymentsConfig,
  PricingConfig,
  ProjectConfig,
  UsersConfig,
  BootstrapConfig,
} from "./schema.js";

// Export schema for advanced use cases
export { ConfigSchema } from "./schema.js";

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
  buildDatabaseUrl,
  buildStorageConfig,
  isDevelopment,
  isProduction,
  isStaging,
} from "./helpers.js";
