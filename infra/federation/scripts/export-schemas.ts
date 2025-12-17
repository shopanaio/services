#!/usr/bin/env tsx

/**
 * Export all Federation subgraph schemas from services.
 * Scans services directories for build.config.json files with graphql configuration.
 * Outputs to federation/schema/ for composition.
 *
 * Federation has two servers: admin and storefront.
 * Each service can contribute to one or both via the graphql field in build.config.json.
 */

import { buildSubgraphSchema, printSubgraphSchema } from "@apollo/subgraph";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { glob } from "glob";
import { gql } from "graphql-tag";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FEDERATION_ROOT = resolve(__dirname, "..");
const PROJECT_ROOT = resolve(FEDERATION_ROOT, "../.."); // Root of services monorepo
const SERVICES_ROOT = resolve(PROJECT_ROOT, "services");
const PLATFORM_ROOT = resolve(PROJECT_ROOT, "..", "platform");

// Schema types that can be defined in build.config.json
type SchemaType = "admin" | "storefront";

interface GraphQLConfig {
  admin?: string | string[];
  storefront?: string | string[];
}

interface BuildConfig {
  entryPoint?: string;
  graphql?: GraphQLConfig;
  assets?: Array<{ include: string; outDir: string }>;
}

interface SubgraphResult {
  name: string;
  type: SchemaType;
  success: boolean;
  fileCount?: number;
  error?: string;
}

async function findGraphQLFiles(patterns: string[], basePath: string): Promise<string[]> {
  const allFiles: string[] = [];

  for (const pattern of patterns) {
    const fullPattern = join(basePath, pattern);
    const files = await glob(fullPattern, {
      nodir: true,
      absolute: true,
    });
    allFiles.push(...files);
  }

  // Deduplicate and sort
  return [...new Set(allFiles)].sort();
}

async function exportSubgraph(
  serviceName: string,
  servicePath: string,
  schemaType: SchemaType,
  patterns: string | string[]
): Promise<SubgraphResult> {
  const subgraphName = `${serviceName}-${schemaType}`;
  const patternArray = Array.isArray(patterns) ? patterns : [patterns];

  try {
    const schemaFiles = await findGraphQLFiles(patternArray, servicePath);

    if (schemaFiles.length === 0) {
      return {
        name: subgraphName,
        type: schemaType,
        success: false,
        error: "no schema files found",
      };
    }

    const modules = schemaFiles.map((path) => ({
      typeDefs: gql(readFileSync(path, "utf-8")),
    }));

    const schema = buildSubgraphSchema(modules);
    const sdl = printSubgraphSchema(schema);

    const outputDir = join(FEDERATION_ROOT, "schema");
    mkdirSync(outputDir, { recursive: true });

    const outputPath = join(outputDir, `${subgraphName}.graphql`);
    writeFileSync(outputPath, sdl, "utf-8");

    return {
      name: subgraphName,
      type: schemaType,
      success: true,
      fileCount: schemaFiles.length,
    };
  } catch (error: any) {
    return {
      name: subgraphName,
      type: schemaType,
      success: false,
      error: error.message,
    };
  }
}

async function processService(serviceName: string, servicePath: string): Promise<SubgraphResult[]> {
  const configPath = join(servicePath, "build.config.json");

  if (!existsSync(configPath)) {
    return [];
  }

  let config: BuildConfig;
  try {
    config = JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    console.warn(`⚠️  ${serviceName}: invalid build.config.json`);
    return [];
  }

  if (!config.graphql) {
    return [];
  }

  const results: SubgraphResult[] = [];

  if (config.graphql.admin) {
    results.push(await exportSubgraph(serviceName, servicePath, "admin", config.graphql.admin));
  }

  if (config.graphql.storefront) {
    results.push(
      await exportSubgraph(serviceName, servicePath, "storefront", config.graphql.storefront)
    );
  }

  return results;
}

async function processPlatform(): Promise<SubgraphResult[]> {
  if (!existsSync(PLATFORM_ROOT)) {
    console.warn("⚠️  Platform directory not found");
    return [];
  }

  const results: SubgraphResult[] = [];

  // Platform admin schema
  const adminPattern = "project/api/graphql-admin/schema/**/*.graphqls";
  results.push(await exportSubgraph("platform", PLATFORM_ROOT, "admin", adminPattern));

  // Platform storefront schema
  const storefrontPattern = "project/api/graphql-client/schema/**/*.graphqls";
  results.push(await exportSubgraph("platform", PLATFORM_ROOT, "storefront", storefrontPattern));

  return results;
}

async function main() {
  console.log("📋 Exporting subgraph schemas\n");

  const allResults: SubgraphResult[] = [];

  // Process platform (Go service with hardcoded paths)
  const platformResults = await processPlatform();
  allResults.push(...platformResults);

  // Discover and process all Node.js services
  if (existsSync(SERVICES_ROOT)) {
    const entries = readdirSync(SERVICES_ROOT, { withFileTypes: true });
    const serviceDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    for (const serviceName of serviceDirs) {
      const servicePath = join(SERVICES_ROOT, serviceName);
      const serviceResults = await processService(serviceName, servicePath);
      allResults.push(...serviceResults);
    }
  }

  // Print results
  const adminResults = allResults.filter((r) => r.type === "admin");
  const storefrontResults = allResults.filter((r) => r.type === "storefront");

  console.log("Admin subgraphs:");
  for (const r of adminResults) {
    if (r.success) {
      console.log(`  ✅ ${r.name} (${r.fileCount} files)`);
    } else {
      console.log(`  ❌ ${r.name}: ${r.error}`);
    }
  }

  console.log("\nStorefront subgraphs:");
  for (const r of storefrontResults) {
    if (r.success) {
      console.log(`  ✅ ${r.name} (${r.fileCount} files)`);
    } else {
      console.log(`  ❌ ${r.name}: ${r.error}`);
    }
  }

  const success = allResults.filter((r) => r.success).length;
  const failed = allResults.filter((r) => !r.success).length;

  console.log(`\n${success} exported, ${failed} failed`);

  if (failed > 0) process.exit(1);
}

main();
