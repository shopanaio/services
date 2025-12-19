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
import { execSync } from "child_process";
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


/**
 * Discover subgraphs from build.config.json files
 */
function discoverSubgraphs(): SubgraphConfig[] {
  const subgraphs: SubgraphConfig[] = [];

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
 * Compose supergraph using mesh-compose (calls infra/federation scripts)
 */
export async function composeSupergraph() {
  const schemaDir = join(federationDir, "schema");

  if (!existsSync(schemaDir)) {
    console.error(`❌ Schema directory not found: ${schemaDir}`);
    console.error("   Run 'yarn shopana schema export' first");
    return false;
  }

  console.log("🔗 Composing supergraph...\n");

  try {
    // Use mesh-compose via yarn scripts in infra/federation
    execSync("yarn compose", {
      cwd: federationDir,
      stdio: "inherit",
    });

    console.log("\n✅ Supergraph composed");
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

  console.log();

  const composeSuccess = await composeSupergraph();

  if (!exportSuccess || !composeSuccess) {
    process.exitCode = 1;
    return;
  }

  console.log("\n✅ Schema build complete!");
}
