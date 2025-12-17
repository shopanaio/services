#!/usr/bin/env tsx

/**
 * Export all Federation subgraph schemas from services.
 * Outputs to federation/schema/ for composition.
 */

import { buildSubgraphSchema, printSubgraphSchema } from "@apollo/subgraph";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { glob } from "glob";
import { gql } from "graphql-tag";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FEDERATION_ROOT = resolve(__dirname, "..");
const PROJECT_ROOT = resolve(FEDERATION_ROOT, "..");

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
      ? resolve(PROJECT_ROOT, "..", "platform")
      : resolve(PROJECT_ROOT, "services", config.service);

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

    const outputDir = join(FEDERATION_ROOT, "schema");
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

async function main() {
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

  if (failed > 0) process.exit(1);
}

main();
