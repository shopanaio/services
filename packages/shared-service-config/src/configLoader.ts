import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import type {
  ConfigStructure,
  Environment,
  ServiceName,
  ResolvedServiceConfig,
  ServiceConfig,
  EnvironmentConfig,
  ResolvedOrchestratorConfig,
} from "./types.js";

/**
 * Find the workspace root by looking for config.yml
 */
function findWorkspaceRoot(startDir: string = process.cwd()): string {
  let currentDir = startDir;

  while (currentDir !== path.dirname(currentDir)) {
    const configPath = path.join(currentDir, "config.yml");
    if (fs.existsSync(configPath)) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  throw new Error(
    "Could not find config.yml in workspace. Please ensure config.yml exists in workspace root."
  );
}

/**
 * Load and parse YAML configuration file
 */
function loadYamlConfig(): ConfigStructure {
  try {
    const workspaceRoot = findWorkspaceRoot();
    const configPath = path.join(workspaceRoot, "config.yml");

    console.log(`Loading configuration from: ${configPath}`);

    const fileContents = fs.readFileSync(configPath, "utf8");
    const yamlConfig = yaml.load(fileContents) as ConfigStructure;

    if (!yamlConfig || typeof yamlConfig !== "object") {
      throw new Error("Invalid configuration file format");
    }

    return yamlConfig;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error loading config.yml: ${error.message}`);
    }
    throw new Error("Unknown error loading configuration");
  }
}

/**
 * Resolve environment variables in configuration values
 */
function resolveEnvironmentVariables(value: any): any {
  if (typeof value === "string") {
    // Replace ${VAR_NAME} with actual environment variable values
    return value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      const envValue = process.env[varName];
      if (envValue === undefined) {
        console.warn(
          `Environment variable ${varName} is not set, keeping placeholder`
        );
        return match;
      }
      return envValue;
    });
  }

  if (Array.isArray(value)) {
    return value.map(resolveEnvironmentVariables);
  }

  if (value && typeof value === "object") {
    const resolved: any = {};
    for (const [key, val] of Object.entries(value)) {
      resolved[key] = resolveEnvironmentVariables(val);
    }
    return resolved;
  }

  return value;
}

/**
 * Deep merge two objects
 */
function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof target[key] === "object" &&
        target[key] !== null &&
        !Array.isArray(target[key]) &&
        typeof source[key] === "object" &&
        source[key] !== null &&
        !Array.isArray(source[key])
      ) {
        (result as any)[key] = deepMerge(target[key], source[key]);
      } else {
        (result as any)[key] = source[key];
      }
    }
  }

  return result;
}

/**
 * Apply environment-specific overrides to configuration
 */
function applyEnvironmentOverrides(
  config: ConfigStructure,
  environment: Environment
): ConfigStructure {
  const envOverrides = config.environments?.[environment];
  if (!envOverrides || !envOverrides.services) {
    return config;
  }

  let result = { ...config };

  // Apply service-specific overrides
  result.services = deepMerge(result.services, envOverrides.services);

  return result;
}

/**
 * Load configuration for a specific service
 */
export function loadServiceConfig(
  serviceName: ServiceName
): ResolvedServiceConfig {
  const environment = (process.env.NODE_ENV || "development") as Environment;

  // Load base configuration
  const baseConfig = loadYamlConfig();

  // Apply environment-specific overrides
  const config = applyEnvironmentOverrides(baseConfig, environment);

  // Resolve environment variables
  const resolvedConfig = resolveEnvironmentVariables(config) as ConfigStructure;

  // Get service configuration
  const serviceConfig = resolvedConfig.services[serviceName];
  if (!serviceConfig) {
    throw new Error(`Configuration for service "${serviceName}" not found`);
  }

  // Override with environment variables
  const finalPort = Number(process.env.PORT) || serviceConfig.port;
  const finalDatabaseUrl =
    process.env.DATABASE_URL || serviceConfig.database_url;

  return {
    serviceName,
    environment,
    service: serviceConfig,
    databaseUrl: finalDatabaseUrl,
    port: finalPort,
  };
}

/**
 * Get list of all available services
 */
export function getAvailableServices(): ServiceName[] {
  const config = loadYamlConfig();
  return Object.keys(config.services) as ServiceName[];
}

/**
 * Get port for a specific service
 */
export function getServicePort(serviceName: ServiceName): number {
  const config = loadServiceConfig(serviceName);
  return config.port;
}

/**
 * Get all services with their ports (useful for development)
 */
export function getAllServicePorts(): Record<string, number> {
  const services = getAvailableServices();
  const result: Record<string, number> = {};

  for (const serviceName of services) {
    const config = loadServiceConfig(serviceName);
    result[serviceName] = config.port;
  }

  return result;
}

/**
 * Load orchestrator configuration
 */
export function loadOrchestratorConfig(): ResolvedOrchestratorConfig {
  const environment = (process.env.NODE_ENV || "development") as Environment;

  // Load configuration
  const config = loadYamlConfig();

  // Resolve environment variables
  const resolvedConfig = resolveEnvironmentVariables(config) as ConfigStructure;

  // Get orchestrator configuration with defaults
  const orchestratorConfig = resolvedConfig.orchestrator || {
    services: [],
    transporter: null,
    log_level: "info",
    metrics_port: 3030,
  };

  // Allow ENV to override which services to load
  let services = orchestratorConfig.services;
  const envServices = process.env.ORCHESTRATOR_SERVICES;
  if (envServices) {
    services = envServices.split(",").map((s) => s.trim()) as ServiceName[];
  }

  // Get transporter configuration
  const transporter = process.env.ORCHESTRATOR_TRANSPORTER !== undefined
    ? process.env.ORCHESTRATOR_TRANSPORTER
    : (orchestratorConfig.transporter || null);

  // Get log level
  const logLevel = process.env.LOG_LEVEL || orchestratorConfig.log_level || "info";

  // Get metrics port
  const metricsPort = process.env.METRICS_PORT
    ? Number(process.env.METRICS_PORT)
    : (orchestratorConfig.metrics_port || 3030);

  return {
    services,
    environment,
    transporter,
    logLevel,
    metricsPort,
  };
}
