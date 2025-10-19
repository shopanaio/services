/**
 * Types for centralized service configuration
 */

/**
 * Configuration for a single service
 */
export interface ServiceConfig {
  /** HTTP port */
  port: number;
  /** Database URL */
  database_url?: string;
}

/**
 * Services configuration map
 */
export interface ServicesConfig {
  /** Apps service configuration */
  apps: ServiceConfig;
  /** Checkout service configuration */
  checkout: ServiceConfig;
  /** Orders service configuration */
  orders: ServiceConfig;
  /** Delivery service configuration */
  delivery: ServiceConfig;
  /** Inventory service configuration */
  inventory: ServiceConfig;
  /** Payments service configuration */
  payments: ServiceConfig;
  /** Platform service configuration */
  platform: ServiceConfig;
  /** Pricing service configuration */
  pricing: ServiceConfig;
}

/**
 * Environment-specific overrides
 */
export interface EnvironmentConfig {
  /** Service-specific configuration overrides */
  services?: Partial<ServicesConfig>;
}

/**
 * Full configuration structure
 */
export interface ConfigStructure {
  /** Services configuration */
  services: ServicesConfig;
  /** Environment-specific overrides */
  environments: {
    development: EnvironmentConfig;
    production: EnvironmentConfig;
  };
}

/**
 * Supported environment types
 */
export type Environment = 'development' | 'production';

/**
 * Service names
 */
export type ServiceName = keyof ServicesConfig;

/**
 * Resolved configuration for a specific service
 */
export interface ResolvedServiceConfig {
  /** Service name */
  serviceName: ServiceName;
  /** Current environment */
  environment: Environment;
  /** Service-specific configuration */
  service: ServiceConfig;
  /** Database URL */
  databaseUrl?: string;
  /** HTTP port */
  port: number;
}
