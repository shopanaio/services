/**
 * @shopana/shared-service-config
 *
 * Centralized configuration management for Shopana microservices.
 * Provides unified configuration loading from a single YAML file.
 */

// Export types
export type {
  ServiceConfig,
  ServicesConfig,
  EnvironmentConfig,
  ConfigStructure,
  Environment,
  ServiceName,
  ResolvedServiceConfig,
} from "./types.js";

// Export configuration loader functions
export {
  loadServiceConfig,
  getAvailableServices,
  getServicePort,
  getAllServicePorts,
} from "./configLoader.js";
