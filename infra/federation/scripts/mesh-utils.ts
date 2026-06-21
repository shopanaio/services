/**
 * Dynamic mesh configuration builder.
 * Reads config.yml and build.config.json files to build subgraph configurations at runtime.
 */

import { loadGraphQLHTTPSubgraph } from "@graphql-mesh/compose-cli";
import { existsSync, readFileSync, readdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FEDERATION_ROOT = resolve(__dirname, "..");
const PROJECT_ROOT = resolve(FEDERATION_ROOT, "../..");
const SERVICES_ROOT = resolve(PROJECT_ROOT, "services");

type MeshType = "admin" | "storefront";

interface ServiceConfig {
  ports?: {
    admin_graphql?: number;
    storefront_graphql?: number;
  };
}

interface GlobalConfig {
  services: Record<string, ServiceConfig>;
}

interface BuildConfig {
  graphql?: {
    admin?: string | string[];
    storefront?: string | string[];
  };
}

interface Subgraph {
  name: string;
  port: number;
  schemaFile: string;
}

function loadGlobalConfig(): GlobalConfig {
  const configFile = process.env.CONFIG_FILE || "config.yml";
  const configPath = resolve(PROJECT_ROOT, configFile);

  if (!existsSync(configPath)) {
    throw new Error(`${configFile} not found at ${configPath}`);
  }
  const content = readFileSync(configPath, "utf-8");
  return parseYaml(content) as GlobalConfig;
}

function loadBuildConfig(servicePath: string): BuildConfig | null {
  const configPath = join(servicePath, "build.config.json");
  if (!existsSync(configPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    return null;
  }
}

function discoverSubgraphs(meshType: MeshType): Subgraph[] {
  const globalConfig = loadGlobalConfig();
  const subgraphs: Subgraph[] = [];

  if (!existsSync(SERVICES_ROOT)) {
    throw new Error(`Services directory not found at ${SERVICES_ROOT}`);
  }

  const entries = readdirSync(SERVICES_ROOT, { withFileTypes: true });
  const serviceDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  const portKey = meshType === "admin" ? "admin_graphql" : "storefront_graphql";

  for (const serviceName of serviceDirs) {
    const servicePath = join(SERVICES_ROOT, serviceName);
    const buildConfig = loadBuildConfig(servicePath);

    if (!buildConfig?.graphql?.[meshType]) {
      continue;
    }

    const serviceConfig = globalConfig.services?.[serviceName];
    const port = serviceConfig?.ports?.[portKey];

    if (port) {
      subgraphs.push({
        name: `${serviceName}-${meshType}`,
        port,
        schemaFile: `./schema/${serviceName}-${meshType}.graphql`,
      });
    }
  }

  return subgraphs.sort((a, b) => a.name.localeCompare(b.name));
}

export function buildSubgraphs(meshType: MeshType) {
  const subgraphs = discoverSubgraphs(meshType);

  return subgraphs.map((sg) => ({
    sourceHandler: loadGraphQLHTTPSubgraph(sg.name, {
      endpoint: `http://localhost:${sg.port}/graphql`,
      source: sg.schemaFile,
    }),
  }));
}
