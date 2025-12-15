#!/usr/bin/env node

/**
 * Universal esbuild configuration for all services
 * Reads build.config.json from each service for assets configuration
 *
 * Usage:
 *   node scripts/build-services.js                    # Build all services
 *   node scripts/build-services.js --service checkout # Build one service
 *   node scripts/build-services.js -s checkout -s orders # Build multiple services
 *   node scripts/build-services.js --parallel         # Build in parallel (faster)
 */

import { build } from "esbuild";
import { addJsExtensionPlugin } from "@shopana/build-tools/esbuild";
import {
  existsSync,
  readdirSync,
  statSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
} from "fs";
import { join, dirname, basename, relative } from "path";
import { fileURLToPath } from "url";
import { parseArgs } from "util";
import { glob } from "glob";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const SERVICES_DIR = join(ROOT_DIR, "services");

/**
 * @typedef {Object} AssetConfig
 * @property {string} include - Glob pattern
 * @property {string} [exclude] - Exclude pattern
 * @property {string} outDir - Output directory
 * @property {boolean} [flatten] - Flatten structure
 */

/**
 * @typedef {Object} BuildConfig
 * @property {string} entryPoint
 * @property {string} [outFile]
 * @property {AssetConfig[]} [assets]
 */

/**
 * Read build.config.json from service directory
 * @param {string} servicePath
 * @param {string} serviceName
 * @returns {BuildConfig}
 */
function readBuildConfig(servicePath, serviceName) {
  const configPath = join(servicePath, "build.config.json");

  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      return config;
    } catch (error) {
      console.warn(`  Warning: Failed to parse build.config.json: ${error.message}`);
    }
  }

  // Default config - auto-detect entry point
  const moduleEntry = `src/${serviceName}.module.ts`;
  const mainEntry = "src/main.ts";

  if (existsSync(join(servicePath, moduleEntry))) {
    return { entryPoint: moduleEntry };
  }

  return { entryPoint: mainEntry };
}

/**
 * Discover all services in the services directory
 */
function discoverServices() {
  const services = [];

  for (const name of readdirSync(SERVICES_DIR)) {
    const servicePath = join(SERVICES_DIR, name);
    if (!statSync(servicePath).isDirectory()) continue;

    const packageJsonPath = join(servicePath, "package.json");
    if (!existsSync(packageJsonPath)) continue;

    services.push(name);
  }

  return services;
}

/**
 * Copy assets based on config
 * @param {string} servicePath
 * @param {AssetConfig[]} assets
 */
async function copyAssets(servicePath, assets) {
  if (!assets || assets.length === 0) return;

  for (const asset of assets) {
    const pattern = join(servicePath, asset.include);
    const outDir = join(servicePath, asset.outDir);

    // Find matching files
    const files = await glob(pattern, {
      ignore: asset.exclude ? [join(servicePath, asset.exclude)] : undefined,
      nodir: true,
    });

    if (files.length === 0) {
      console.log(`    ⚠️  No files match: ${asset.include}`);
      continue;
    }

    mkdirSync(outDir, { recursive: true });

    // Determine the base directory for preserving structure
    const includeBase = asset.include.split("*")[0].replace(/\/$/, "");
    const baseDir = join(servicePath, includeBase);

    for (const file of files) {
      let destPath;

      if (asset.flatten !== false) {
        // Flatten: just copy file name
        destPath = join(outDir, basename(file));
      } else {
        // Preserve structure relative to include base
        const relPath = relative(baseDir, file);
        destPath = join(outDir, relPath);
        mkdirSync(dirname(destPath), { recursive: true });
      }

      copyFileSync(file, destPath);
    }

    console.log(`    📄 Copied ${files.length} files → ${asset.outDir}`);
  }
}

/**
 * Build a single service
 */
async function buildService(serviceName) {
  const servicePath = join(SERVICES_DIR, serviceName);
  const startTime = Date.now();

  console.log(`\n📦 Building ${serviceName}...`);

  // Read config
  const config = readBuildConfig(servicePath, serviceName);
  const entryPath = join(servicePath, config.entryPoint);

  if (!existsSync(entryPath)) {
    console.log(`  ❌ Entry point not found: ${config.entryPoint}`);
    return { name: serviceName, success: false, error: "Entry point not found" };
  }

  // Determine output file
  const outFile = config.outFile || `dist/${serviceName}.module.js`;

  try {
    // Build with esbuild
    await build({
      entryPoints: [entryPath],
      platform: "node",
      bundle: true,
      format: "esm",
      outfile: join(servicePath, outFile),
      packages: "external",
      sourcemap: true,
      minify: false,
      plugins: [addJsExtensionPlugin],
      logLevel: "warning",
    });

    console.log(`  ✅ Built ${outFile}`);

    // Copy assets
    await copyAssets(servicePath, config.assets);

    const duration = Date.now() - startTime;
    console.log(`  ⏱️  ${duration}ms`);

    return { name: serviceName, success: true, duration };
  } catch (error) {
    console.log(`  ❌ Build failed: ${error.message}`);
    return { name: serviceName, success: false, error: error.message };
  }
}

/**
 * Build services sequentially
 */
async function buildSequential(services) {
  const results = [];

  for (const service of services) {
    results.push(await buildService(service));
  }

  return results;
}

/**
 * Build services in parallel
 */
async function buildParallel(services) {
  return Promise.all(services.map(buildService));
}

/**
 * Print build summary
 */
function printSummary(results) {
  console.log("\n" + "═".repeat(50));

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  if (successful.length > 0) {
    const totalTime = successful.reduce((sum, r) => sum + (r.duration || 0), 0);
    console.log(`\n✅ Built ${successful.length} service(s) in ${totalTime}ms`);
    successful.forEach((r) => console.log(`   • ${r.name} (${r.duration}ms)`));
  }

  if (failed.length > 0) {
    console.log(`\n❌ Failed to build ${failed.length} service(s):`);
    failed.forEach((r) => console.log(`   • ${r.name}: ${r.error}`));
    process.exitCode = 1;
  }
}

/**
 * Main
 */
async function main() {
  const { values } = parseArgs({
    options: {
      service: { type: "string", short: "s", multiple: true },
      parallel: { type: "boolean", short: "p", default: false },
      list: { type: "boolean", short: "l", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
Usage: node scripts/build-services.js [options]

Options:
  -s, --service <name>  Build specific service(s). Can be used multiple times.
  -p, --parallel        Build services in parallel (faster but less readable output)
  -l, --list            List all available services
  -h, --help            Show this help message

Examples:
  node scripts/build-services.js                      # Build all services
  node scripts/build-services.js -s checkout          # Build checkout service
  node scripts/build-services.js -s checkout -s orders # Build multiple services
  node scripts/build-services.js --parallel           # Build all in parallel

Config:
  Each service can have a build.config.json with:
  {
    "entryPoint": "src/myservice.module.ts",
    "assets": [
      { "include": "src/**/*.graphql", "outDir": "dist/schema" }
    ]
  }
`);
    return;
  }

  const allServices = discoverServices();

  if (values.list) {
    console.log("Available services:");
    allServices.forEach((s) => {
      const configPath = join(SERVICES_DIR, s, "build.config.json");
      const hasConfig = existsSync(configPath) ? "✓" : " ";
      console.log(`  ${hasConfig} ${s}`);
    });
    return;
  }

  // Determine which services to build
  let servicesToBuild = allServices;

  if (values.service && values.service.length > 0) {
    // Validate requested services
    const invalid = values.service.filter((s) => !allServices.includes(s));
    if (invalid.length > 0) {
      console.error(`❌ Unknown service(s): ${invalid.join(", ")}`);
      console.error(`   Available: ${allServices.join(", ")}`);
      process.exitCode = 1;
      return;
    }
    servicesToBuild = values.service;
  }

  console.log(`🚀 Building ${servicesToBuild.length} service(s)...`);
  if (values.parallel) {
    console.log("   (parallel mode)");
  }

  const startTime = Date.now();

  const results = values.parallel
    ? await buildParallel(servicesToBuild)
    : await buildSequential(servicesToBuild);

  const totalDuration = Date.now() - startTime;

  printSummary(results);
  console.log(`\n⏱️  Total time: ${totalDuration}ms\n`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
