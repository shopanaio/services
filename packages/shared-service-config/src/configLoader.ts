import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import type {
  ConfigStructure,
  ServiceName,
  ServicesConfig,
  VarsConfig,
} from "./types.js";

/**
 * Find the workspace root by looking for config.yml
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
    } catch (e) {
      // package.json not found or not readable, continue searching
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached filesystem root
    currentDir = parentDir;
  }

  throw new Error("Could not find project root directory with workspaces");
}

/**
 * Load and parse YAML configuration file
 */
function loadYamlConfig(): ConfigStructure {
  try {
    const workspaceRoot = findWorkspaceRoot();

    // Check for CONFIG_FILE env var (e.g., config.local.yml)
    const configFile = process.env.CONFIG_FILE || "config.yml";
    const configPath = path.join(workspaceRoot, configFile);

    console.log(`Loading configuration from: ${configPath}`);

    const fileContents = fs.readFileSync(configPath, "utf8");
    const yamlConfig = yaml.load(fileContents) as ConfigStructure;

    if (!yamlConfig || typeof yamlConfig !== "object") {
      throw new Error("Invalid configuration file format");
    }

    if (!yamlConfig.vars) {
      throw new Error("Missing 'vars' section in config.yml");
    }

    if (!yamlConfig.services) {
      throw new Error("Missing 'services' section in config.yml");
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
 * Load configuration for a specific service
 */
export function loadServiceConfig<T extends ServiceName>(
  serviceName: T
): {
  config: ServicesConfig[T];
  vars: VarsConfig;
} {
  // Load configuration
  const config = loadYamlConfig();

  // Get service configuration
  const serviceConfig = config.services[serviceName];
  if (!serviceConfig) {
    throw new Error(`Configuration for service "${serviceName}" not found`);
  }

  return {
    config: config.services[serviceName],
    vars: config.vars,
  };
}
