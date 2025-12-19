#!/usr/bin/env tsx

/**
 * GraphQL Federation schema management
 * - Export subgraph schemas from services (reads build.config.json)
 * - Compose supergraph using @wundergraph/composition
 */

import { buildSubgraphSchema, printSubgraphSchema } from "@apollo/subgraph";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { glob } from "glob";
import { gql } from "graphql-tag";
import { join } from "path";
import { federateSubgraphs } from "@wundergraph/composition";
import { parse } from "graphql";
import { findRootDir } from "../utils.js";

const rootDir = findRootDir();
const federationDir = join(rootDir, "infra", "federation");
const servicesDir = join(rootDir, "services");

type SchemaType = "admin" | "storefront";

interface BuildConfig {
  graphql?: {
    admin?: string[];
    storefront?: string[];
  };
}

interface SubgraphConfig {
  name: string;
  service: string;
  type: SchemaType;
  patterns: string[];
  servicePath: string;
}

// Subgraph routing URLs for federation
const SUBGRAPH_URLS: Record<string, string> = {
  "platform-admin": "http://localhost:50051/graphql",
  "platform-storefront": "http://localhost:50052/graphql",
  "apps-admin": "http://localhost:10001/graphql",
  "inventory-admin": "http://localhost:10005/graphql",
  "media-admin": "http://localhost:10007/graphql",
  "checkout-storefront": "http://localhost:10002/graphql",
  "orders-storefront": "http://localhost:10003/graphql",
  "orders-admin": "http://localhost:10004/graphql",
  "project-admin": "http://localhost:10006/graphql",
  "users-admin": "http://localhost:10008/graphql",
};

/**
 * Discover subgraphs from build.config.json files
 */
function discoverSubgraphs(): SubgraphConfig[] {
  const subgraphs: SubgraphConfig[] = [];

  // Platform (Go) - hardcoded for now as it doesn't use build.config.json
  const platformPath = join(rootDir, "..", "platform");
  if (existsSync(platformPath)) {
    subgraphs.push({
      name: "platform-admin",
      service: "platform",
      type: "admin",
      patterns: ["project/api/graphql-admin/schema/**/*.graphqls"],
      servicePath: platformPath,
    });
    subgraphs.push({
      name: "platform-storefront",
      service: "platform",
      type: "storefront",
      patterns: ["project/api/graphql-client/schema/**/*.graphqls"],
      servicePath: platformPath,
    });
  }

  // Node.js services - read from build.config.json
  if (!existsSync(servicesDir)) return subgraphs;

  const entries = readdirSync(servicesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const servicePath = join(servicesDir, entry.name);
    const configPath = join(servicePath, "build.config.json");

    if (!existsSync(configPath)) continue;

    try {
      const config: BuildConfig = JSON.parse(readFileSync(configPath, "utf-8"));
      if (!config.graphql) continue;

      // Add admin subgraph if defined
      if (config.graphql.admin && config.graphql.admin.length > 0) {
        subgraphs.push({
          name: `${entry.name}-admin`,
          service: entry.name,
          type: "admin",
          patterns: config.graphql.admin,
          servicePath,
        });
      }

      // Add storefront subgraph if defined
      if (config.graphql.storefront && config.graphql.storefront.length > 0) {
        subgraphs.push({
          name: `${entry.name}-storefront`,
          service: entry.name,
          type: "storefront",
          patterns: config.graphql.storefront,
          servicePath,
        });
      }
    } catch {
      console.warn(`⚠️  ${entry.name}: invalid build.config.json`);
    }
  }

  return subgraphs;
}

async function findGraphQLFiles(servicePath: string, patterns: string[]): Promise<string[]> {
  const allFiles: string[] = [];

  for (const pattern of patterns) {
    const fullPattern = join(servicePath, pattern);
    const files = await glob(fullPattern, {
      nodir: true,
      absolute: true,
    });
    allFiles.push(...files);
  }

  // Deduplicate and sort
  return [...new Set(allFiles)].sort();
}

async function exportSubgraph(config: SubgraphConfig): Promise<boolean> {
  if (!existsSync(config.servicePath)) {
    console.warn(`⚠️  ${config.name}: service not found`);
    return false;
  }

  const schemaFiles = await findGraphQLFiles(config.servicePath, config.patterns);

  if (schemaFiles.length === 0) {
    console.warn(`⚠️  ${config.name}: no schema files`);
    return false;
  }

  try {
    const modules = schemaFiles.map((path) => ({
      typeDefs: gql(readFileSync(path, "utf-8")),
    }));

    const schema = buildSubgraphSchema(modules);
    const sdl = printSubgraphSchema(schema);

    const outputDir = join(federationDir, "schema");
    mkdirSync(outputDir, { recursive: true });

    const outputPath = join(outputDir, `${config.name}.graphql`);
    writeFileSync(outputPath, sdl, "utf-8");

    console.log(`✅ ${config.name} (${schemaFiles.length} files)`);
    return true;
  } catch (error: any) {
    console.error(`❌ ${config.name}: ${error.message}`);
    return false;
  }
}

/**
 * Export all subgraph schemas from services
 */
export async function exportSchemas() {
  console.log("📋 Exporting subgraph schemas\n");

  const subgraphs = discoverSubgraphs();

  let success = 0;
  let failed = 0;

  for (const config of subgraphs) {
    if (await exportSubgraph(config)) {
      success++;
    } else {
      failed++;
    }
  }

  console.log(`\n${success} exported, ${failed} failed`);

  return failed === 0;
}

/**
 * Compose supergraph from subgraphs using @wundergraph/composition
 */
export async function composeSupergraph() {
  const schemaDir = join(federationDir, "schema");
  const outputFile = join(federationDir, "schema", "supergraph.graphql");

  if (!existsSync(schemaDir)) {
    console.error(`❌ Schema directory not found: ${schemaDir}`);
    console.error("   Run 'yarn shopana schema export' first");
    return false;
  }

  console.log("🔗 Composing supergraph...\n");

  try {
    const discoveredSubgraphs = discoverSubgraphs();
    const subgraphs: Array<{ name: string; url: string; definitions: ReturnType<typeof parse> }> = [];

    for (const config of discoveredSubgraphs) {
      const schemaFile = join(schemaDir, `${config.name}.graphql`);

      if (!existsSync(schemaFile)) {
        console.warn(`⚠️  Skipping ${config.name}: schema not found`);
        continue;
      }

      const sdl = readFileSync(schemaFile, "utf-8");
      const url = SUBGRAPH_URLS[config.name] || `http://localhost:3000/${config.name}`;

      subgraphs.push({
        name: config.name,
        url,
        definitions: parse(sdl),
      });

      console.log(`   ✓ ${config.name}`);
    }

    if (subgraphs.length === 0) {
      console.error("\n❌ No subgraphs found to compose");
      return false;
    }

    console.log(`\n   Composing ${subgraphs.length} subgraphs...`);

    // Compose federation supergraph
    const result = federateSubgraphs({ subgraphs });

    if (result.errors && result.errors.length > 0) {
      console.error("\n❌ Composition errors:");
      for (const error of result.errors) {
        console.error(`   • ${error.message}`);
      }
      return false;
    }

    if (!result.federatedGraphAST) {
      console.error("\n❌ Composition produced no output");
      return false;
    }

    // Write supergraph SDL
    const { print } = await import("graphql");
    const supergraphSDL = print(result.federatedGraphAST);

    writeFileSync(outputFile, supergraphSDL, "utf-8");

    console.log(`\n✅ Supergraph: ${outputFile}`);
    console.log(`   ${subgraphs.length} subgraphs composed`);
    return true;
  } catch (error: any) {
    console.error(`\n❌ Composition failed: ${error.message}`);
    return false;
  }
}

/**
 * Full schema build: export + compose
 */
export async function buildSchemas() {
  const exportSuccess = await exportSchemas();
  if (!exportSuccess) {
    process.exitCode = 1;
    return;
  }

  console.log();

  const composeSuccess = await composeSupergraph();
  if (!composeSuccess) {
    process.exitCode = 1;
    return;
  }

  console.log("\n✅ Schema build complete!");
}
