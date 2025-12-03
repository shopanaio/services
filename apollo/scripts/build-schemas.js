#!/usr/bin/env node

/**
 * Universal script to export all Apollo Federation subgraph schemas.
 * This script builds subgraph schemas from all services and exports them
 * to a specified output directory for use with Apollo Rover.
 *
 * Usage:
 *   tsx build-schemas.js [output-directory]
 *   Default output: apollo/schema
 *
 * Uses tsx to run TypeScript directly without compilation.
 */

import { printSubgraphSchema, buildSubgraphSchema } from "@apollo/subgraph";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { gql } from "graphql-tag";
import { glob } from "glob";

// Configuration for all services and their schemas
// Schema files are auto-discovered recursively using glob patterns
const SERVICES_CONFIG = [
  // Platform services (Go-based) - use only .graphqls files
  {
    name: "platform",
    api: "admin-api",
    outputFile: "platform-admin-api.graphql",
    schemaPath: ["project", "api", "graphql-admin", "schema"],
    filePattern: "**/*.graphqls", // Platform uses .graphqls extension
  },
  {
    name: "platform",
    api: "storefront-api",
    outputFile: "platform-storefront-api.graphql",
    schemaPath: ["project", "api", "graphql-client", "schema"],
    filePattern: "**/*.graphqls", // Platform uses .graphqls extension
  },
  // Node.js microservices - use .graphql files
  {
    name: "apps",
    api: "admin-api",
    outputFile: "apps-admin-api.graphql",
    schemaPath: ["src", "api", "schema"],
    filePattern: "**/*.graphql",
  },
  {
    name: "inventory",
    api: "admin-api",
    outputFile: "inventory-admin-api.graphql",
    schemaPath: ["src", "api", "graphql-admin"],
    filePattern: "**/*.graphql",
  },
  {
    name: "media",
    api: "admin-api",
    outputFile: "media-admin-api.graphql",
    schemaPath: ["src", "api", "graphql-admin"],
    filePattern: "**/*.graphql",
  },
  {
    name: "checkout",
    api: "storefront-api",
    outputFile: "checkout-storefront-api.graphql",
    schemaPath: ["src", "interfaces", "gql-storefront-api", "schema"],
    filePattern: "**/*.graphql",
  },
  {
    name: "orders",
    api: "storefront-api",
    outputFile: "orders-storefront-api.graphql",
    schemaPath: ["src", "interfaces", "gql-storefront-api", "schema"],
    filePattern: "**/*.graphql",
  },
];

/**
 * Find all GraphQL schema files in a directory recursively using glob
 * @param {string} directory - Directory to search
 * @param {string} pattern - Glob pattern for file matching
 */
async function findGraphQLFiles(directory, pattern = "**/*.{graphql,graphqls}") {
  if (!existsSync(directory)) {
    return [];
  }

  // Search for schema files recursively
  const fullPattern = join(directory, pattern);
  const files = await glob(fullPattern, {
    nodir: true,
    absolute: true,
  });

  // Sort alphabetically for consistent ordering
  return files.sort();
}

/**
 * Export a single service schema
 * @param {object} config - Service configuration
 * @param {string} outputDir - Output directory path (relative to project root)
 */
async function exportServiceSchema(config, outputDir) {
  // Get project root (1 level up from apollo)
  const projectRoot = resolve(process.cwd(), "..");

  // Platform is in different directory structure than services
  // Platform: /platform/project/api/...
  // Services: /services/{service-name}/src/...
  const servicePath =
    config.name === "platform"
      ? resolve(projectRoot, "platform")
      : resolve(projectRoot, "services", config.name);

  if (!existsSync(servicePath)) {
    console.warn(`⚠️  Service directory not found: ${servicePath}`);
    return false;
  }

  try {
    console.log(`📦 Exporting ${config.name} ${config.api} GraphQL schema...`);

    // Build path to schema directory
    const schemaDir = join(servicePath, ...config.schemaPath);

    // Auto-discover all GraphQL files recursively using glob
    const filePattern = config.filePattern || "**/*.{graphql,graphqls}";
    const schemaFiles = await findGraphQLFiles(schemaDir, filePattern);

    if (schemaFiles.length === 0) {
      console.warn(`⚠️  No GraphQL schema files found in: ${schemaDir}`);
      return false;
    }

    console.log(
      `   Found ${schemaFiles.length} schema file(s) (recursive scan):`
    );
    // Show first 10 files and count
    const displayFiles = schemaFiles.slice(0, 10);
    displayFiles.forEach((file) => {
      const relativePath = file.replace(schemaDir + "/", "");
      console.log(`   - ${relativePath}`);
    });
    if (schemaFiles.length > 10) {
      console.log(`   ... and ${schemaFiles.length - 10} more files`);
    }

    // Build modules array - only typeDefs needed for schema export
    const modules = schemaFiles.map((path) => ({
      typeDefs: gql(readFileSync(path, "utf-8")),
    }));

    // Build subgraph schema
    const schema = buildSubgraphSchema(modules);

    // Print schema to SDL
    const schemaSDL = printSubgraphSchema(schema);

    // Build output path and ensure directory exists
    const outputDirPath = resolve(projectRoot, outputDir);
    if (!existsSync(outputDirPath)) {
      mkdirSync(outputDirPath, { recursive: true });
    }

    // Write to output directory
    const outputPath = join(outputDirPath, config.outputFile);
    writeFileSync(outputPath, schemaSDL, "utf-8");

    console.log(`✅ Schema exported to: ${outputPath}`);
    console.log(`📊 Schema size: ${schemaSDL.length} bytes`);

    return true;
  } catch (error) {
    console.error(`❌ Failed to export ${config.name} schema:`, error.message);
    return false;
  }
}

/**
 * Main function to export all schemas
 */
async function exportAllSchemas() {
  // Get output directory from CLI argument or use default
  const outputDir = process.argv[2] || "apollo/schema";

  console.log("🚀 Starting export of all Apollo Federation subgraph schemas");
  console.log("=".repeat(70));
  console.log(`📁 Output directory: ${outputDir}`);
  console.log("");

  let successCount = 0;
  let failCount = 0;

  for (const config of SERVICES_CONFIG) {
    const success = await exportServiceSchema(config, outputDir);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    console.log(""); // Empty line between services
  }

  console.log("=".repeat(70));
  console.log(`📊 Export Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📁 Output directory: ${outputDir}`);

  if (failCount > 0) {
    console.log("");
    console.log("⚠️  Some schemas failed to export. Check the logs above.");
    process.exit(1);
  }

  console.log("");
  console.log("🎉 All schemas exported successfully!");
}

// Run the export
exportAllSchemas().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
