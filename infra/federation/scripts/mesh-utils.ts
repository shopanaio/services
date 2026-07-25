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
const APPS_ROOT = resolve(PROJECT_ROOT, "apps");

type MeshType = "admin" | "storefront";

interface ServiceConfig {
  ports?: {
    admin_graphql?: number;
    app_admin_graphql?: number;
    app_storefront_graphql?: number;
    iam_http?: number;
    storefront_graphql?: number;
  };
}

interface GlobalConfig {
  services: Record<
    string,
    ServiceConfig & {
      applications?: Record<string, ServiceConfig & { enabled?: boolean }>;
    }
  >;
}

interface BuildConfig {
  graphql?: {
    admin?: string | string[];
    storefront?: string | string[];
  };
}

interface Subgraph {
  name: string;
  endpoint: string;
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

  const portKey = meshType === "admin" ? "admin_graphql" : "storefront_graphql";

  for (const root of [
    { path: SERVICES_ROOT, kind: "service" as const },
    { path: APPS_ROOT, kind: "app" as const },
  ]) {
    if (!existsSync(root.path)) continue;
    const units = readdirSync(root.path, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    for (const unitName of units) {
      const unitPath = join(root.path, unitName);
      const buildConfig = loadBuildConfig(unitPath);

      if (!buildConfig?.graphql?.[meshType]) {
        continue;
      }

      const serviceConfig =
        root.kind === "app"
          ? globalConfig.services?.apps?.applications?.[unitName]
          : globalConfig.services?.[unitName];
      const port =
        root.kind === "app"
          ? meshType === "admin"
            ? globalConfig.services?.apps?.ports?.app_admin_graphql
            : globalConfig.services?.apps?.ports?.app_storefront_graphql
          : serviceConfig?.ports?.[portKey] ??
            (meshType === "admin" ? serviceConfig?.ports?.iam_http : undefined);
      const subgraphName =
        root.kind === "app" ? `apps-${unitName}` : unitName;

      if (port && serviceConfig?.enabled !== false) {
        subgraphs.push({
          name: `${subgraphName}-${meshType}`,
          endpoint:
            root.kind === "app"
              ? `http://localhost:${port}/subgraphs/${unitName}/graphql`
              : `http://localhost:${port}/graphql`,
          schemaFile: `./schema/${subgraphName}-${meshType}.graphql`,
        });
      }
    }
  }

  return subgraphs.sort((a, b) => a.name.localeCompare(b.name));
}

export function buildSubgraphs(meshType: MeshType) {
  const subgraphs = discoverSubgraphs(meshType);

  return subgraphs.map((sg) => ({
    sourceHandler: loadGraphQLHTTPSubgraph(sg.name, {
      endpoint: sg.endpoint,
      source: sg.schemaFile,
    }),
  }));
}
