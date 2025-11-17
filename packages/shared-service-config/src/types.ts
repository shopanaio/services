/**
 * Types for centralized service configuration
 */

/**
 * Common variables shared across all services
 */
export interface VarsConfig {
  /** Environment for all services */
  environment: string;
  /** Log level for all services */
  log_level: string;
  /** Moleculer transporter for services broker */
  moleculer_transporter: string;
  /** Platform GRPC (context) server */
  platform_grpc_host: string;
}

/**
 * Services configuration map
 */
export type ServicesConfig = {
  /** Orchestrator service configuration */
  orchestrator: {
    services: string[];
    metrics_port?: number;
  };
  /** Checkout service configuration */
  checkout: {
    storefront_graphql_port: number;
    // admin_graphql_port: number; TODO: add admin graphql port when admin api is ready
    metrics_port?: number;
    database_url?: string;
  };
  /** Orders service configuration */
  orders: {
    storefront_graphql_port: number;
    // admin_graphql_port: number; TODO: add admin graphql port when admin api is ready
    metrics_port?: number;
    database_url?: string;
  };
  /** Apps service configuration */
  apps: {
    // storefront_graphql_port: number; TODO: add storefront graphql port when storefront api is ready
    admin_graphql_port: number;
    metrics_port?: number;
    database_url?: string;
  };
  /** Delivery service configuration */
  delivery: {
    metrics_port?: number;
  };
  /** Inventory service configuration */
  inventory: {
    metrics_port?: number;
    object_storage_endpoint?: string;
    object_storage_access_key?: string;
    object_storage_secret_key?: string;
    object_storage_bucket?: string;
    object_storage_region?: string;
    object_storage_prefix?: string;
    object_storage_path_style?: string;
    object_storage_session_token?: string;
  };
  /** Payments service configuration */
  payments: {
    metrics_port?: number;
  };
  /** Pricing service configuration */
  pricing: {
    metrics_port?: number;
  };
};

/**
 * Full configuration structure
 */
export interface ConfigStructure {
  /** Common variables */
  vars: VarsConfig;
  /** Services configuration */
  services: ServicesConfig;
}

/**
 * Service names
 */
export type ServiceName = keyof ServicesConfig;
