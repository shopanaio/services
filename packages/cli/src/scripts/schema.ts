#!/usr/bin/env tsx

/**
 * GraphQL Federation schema management
 * - Export subgraph schemas from services
 * - Compose supergraph using @wundergraph/composition
 */

import { buildSubgraphSchema, printSubgraphSchema } from "@apollo/subgraph";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { glob } from "glob";
import { gql } from "graphql-tag";
import { join } from "path";
import { federateSubgraphs } from "@wundergraph/composition";
import { parse } from "graphql";
import { findRootDir } from "../utils.js";

const rootDir = findRootDir();
const federationDir = join(rootDir, "infra", "federation");

// Subgraph configurations
const SUBGRAPHS = [
  // Platform (Go)
  {
    name: "platform-admin",
    service: "platform",
    schemaPath: ["project", "api", "graphql-admin", "schema"],
    filePattern: "**/*.graphqls",
  },
  {
    name: "platform-storefront",
    service: "platform",
    schemaPath: ["project", "api", "graphql-client", "schema"],
    filePattern: "**/*.graphqls",
  },
  // Node.js services
  {
    name: "apps-admin",
    service: "apps",
    schemaPath: ["src", "api", "schema"],
    filePattern: "**/*.graphql",
  },
  {
    name: "inventory-admin",
    service: "inventory",
    schemaPath: ["src", "api", "graphql-admin"],
    filePattern: "**/*.graphql",
  },
  {
    name: "media-admin",
    service: "media",
    schemaPath: ["src", "api", "graphql-admin"],
    filePattern: "**/*.graphql",
  },
  {
    name: "checkout-storefront",
    service: "checkout",
    schemaPath: ["src", "interfaces", "gql-storefront-api", "schema"],
    filePattern: "**/*.graphql",
  },
  {
    name: "orders-storefront",
    service: "orders",
    schemaPath: ["src", "interfaces", "gql-storefront-api", "schema"],
    filePattern: "**/*.graphql",
  },
];

async function findGraphQLFiles(directory: string, pattern: string) {
  if (!existsSync(directory)) return [];

  const files = await glob(join(directory, pattern), {
    nodir: true,
    absolute: true,
  });

  return files.sort();
}

async function exportSubgraph(config: (typeof SUBGRAPHS)[number]) {
  const servicePath =
    config.service === "platform"
      ? join(rootDir, "..", "platform")
      : join(rootDir, "services", config.service);

  if (!existsSync(servicePath)) {
    console.warn(`⚠️  ${config.name}: service not found`);
    return false;
  }

  const schemaDir = join(servicePath, ...config.schemaPath);
  const schemaFiles = await findGraphQLFiles(schemaDir, config.filePattern);

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

  let success = 0;
  let failed = 0;

  for (const config of SUBGRAPHS) {
    if (await exportSubgraph(config)) {
      success++;
    } else {
      failed++;
    }
  }

  console.log(`\n${success} exported, ${failed} failed`);

  return failed === 0;
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
};

/**
 * Compose supergraph from subgraphs using @wundergraph/composition
 */
export async function composeSupergraph() {
  const schemaDir = join(federationDir, "schema");
  const outputFile = join(federationDir, "supergraph.graphql");

  if (!existsSync(schemaDir)) {
    console.error(`❌ Schema directory not found: ${schemaDir}`);
    console.error("   Run 'yarn shopana schema export' first");
    return false;
  }

  console.log("🔗 Composing supergraph...\n");

  try {
    // Load all exported subgraph schemas
    const subgraphs: Array<{ name: string; url: string; definitions: ReturnType<typeof parse> }> = [];

    for (const config of SUBGRAPHS) {
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
