/**
 * @shopana/shared-service-config
 *
 * Centralized configuration management for Shopana microservices.
 * Provides unified configuration loading from a single YAML file.
 */

// Export types
export type { ServicesConfig, ConfigStructure, ServiceName } from "./types.js";

// Export configuration loader functions
export { loadServiceConfig, findWorkspaceRoot } from "./configLoader.js";
