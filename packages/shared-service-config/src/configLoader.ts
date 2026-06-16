import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { ZodError } from "zod";
import {
  ConfigSchema,
  type Config,
  type GlobalConfig,
  type ServiceConfig,
} from "./schema.js";

// Cached configuration
let cachedConfig: Config | null = null;

/**
 * Find the workspace root by looking for package.json with workspaces
 */
export function findWorkspaceRoot(startDir: string = process.cwd()): string {
  let currentDir = path.resolve(startDir);

  while (currentDir !== path.parse(currentDir).root) {
    const packageJsonPath = path.join(currentDir, "package.json");
    try {
      const packageJson = fs.readFileSync(packageJsonPath, "utf-8");
      if (!packageJson) {
        continue;
      }
      const pkg = JSON.parse(packageJson);
      if (pkg.workspaces) {
        return currentDir;
      }
    } catch {
      // package.json not found or not readable, continue searching
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached filesystem root
    currentDir = parentDir;
  }

  throw new Error("Could not find project root directory with workspaces");
}

/**
 * Substitute ${ENV_VAR} patterns with environment variable values
 */
function substituteEnvVars(obj: unknown): unknown {
  if (typeof obj === "string") {
    // Match ${ENV_VAR} pattern
    const envVarPattern = /\$\{([^}]+)\}/g;
    let result = obj;
    let match;

    while ((match = envVarPattern.exec(obj)) !== null) {
      const envVarName = match[1];
      const envValue = process.env[envVarName];

      if (envValue !== undefined) {
        result = result.replace(match[0], envValue);
      }
      // If env var is not set, keep the placeholder (will fail validation if required)
    }

    return result;
  }

  if (Array.isArray(obj)) {
    return obj.map(substituteEnvVars);
  }

  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = substituteEnvVars(value);
    }
    return result;
  }

  return obj;
}

/**
 * Load and parse YAML configuration file with ENV substitution and Zod validation
 */
function loadYamlConfig(): Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const workspaceRoot = findWorkspaceRoot();

    // Check for CONFIG_FILE env var (e.g., config.local.yml)
    const configFile = process.env.CONFIG_FILE || "config.yml";
    const configPath = path.join(workspaceRoot, configFile);

    const fileContents = fs.readFileSync(configPath, "utf8");
    const rawConfig = yaml.load(fileContents);

    if (!rawConfig || typeof rawConfig !== "object") {
      throw new Error("Invalid configuration file format");
    }

    // Substitute environment variables
    const substitutedConfig = substituteEnvVars(rawConfig);

    // Validate with Zod schema
    const validatedConfig = ConfigSchema.parse(substitutedConfig);

    // Cache the validated config
    cachedConfig = validatedConfig;

    return validatedConfig;
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n");
      throw new Error(`Configuration validation failed:\n${issues}`);
    }
    if (error instanceof Error) {
      throw new Error(`Error loading config.yml: ${error.message}`);
    }
    throw new Error("Unknown error loading configuration");
  }
}

/**
 * Clear cached configuration (useful for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

/**
 * Get the full validated configuration
 */
export function getConfig(): Config {
  return loadYamlConfig();
}

/**
 * Get global configuration
 */
export function getGlobalConfig(): GlobalConfig {
  return loadYamlConfig().global;
}

/**
 * Load configuration for a specific service
 */
export function getServiceConfig(serviceName: string): {
  service: ServiceConfig;
  global: GlobalConfig;
} {
  const config = loadYamlConfig();
  const serviceConfig = config.services[serviceName];

  if (!serviceConfig) {
    throw new Error(`Configuration for service "${serviceName}" not found`);
  }

  return {
    service: serviceConfig,
    global: config.global,
  };
}

// Legacy export for backwards compatibility
export function loadServiceConfig(serviceName: string): {
  config: ServiceConfig;
  vars: GlobalConfig;
} {
  const { service, global } = getServiceConfig(serviceName);
  return {
    config: service,
    vars: global,
  };
}
