#!/usr/bin/env tsx

/**
 * Universal esbuild configuration for all services
 * Reads build.config.json from each service for assets configuration
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
  rmSync,
} from "fs";
import { join, dirname, basename, relative } from "path";
import { glob } from "glob";
import { findRootDir } from "../utils.js";

interface AssetConfig {
  include: string;
  exclude?: string;
  outDir: string;
  flatten?: boolean;
}

interface BuildConfig {
  entryPoint: string;
  outFile?: string;
  assets?: AssetConfig[];
}

interface BuildResult {
  name: string;
  success: boolean;
  duration?: number;
  error?: string;
}

export function getServicesDir() {
  return join(findRootDir(), "services");
}

/**
 * Read build.config.json from service directory
 */
function readBuildConfig(servicePath: string, serviceName: string): BuildConfig {
  const configPath = join(servicePath, "build.config.json");

  if (existsSync(configPath)) {
    try {
      return JSON.parse(readFileSync(configPath, "utf-8"));
    } catch (error: any) {
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
export function discoverServices(): string[] {
  const servicesDir = getServicesDir();
  const services: string[] = [];

  for (const name of readdirSync(servicesDir)) {
    const servicePath = join(servicesDir, name);
    if (!statSync(servicePath).isDirectory()) continue;

    const packageJsonPath = join(servicePath, "package.json");
    if (!existsSync(packageJsonPath)) continue;

    services.push(name);
  }

  return services;
}

/**
 * Copy assets based on config
 */
async function copyAssets(servicePath: string, assets?: AssetConfig[]) {
  if (!assets || assets.length === 0) return;

  for (const asset of assets) {
    const pattern = join(servicePath, asset.include);
    const outDir = join(servicePath, asset.outDir);

    const files = await glob(pattern, {
      ignore: asset.exclude ? [join(servicePath, asset.exclude)] : undefined,
      nodir: true,
    });

    if (files.length === 0) {
      console.log(`    ⚠️  No files match: ${asset.include}`);
      continue;
    }

    mkdirSync(outDir, { recursive: true });

    const includeBase = asset.include.split("*")[0].replace(/\/$/, "");
    const baseDir = join(servicePath, includeBase);

    for (const file of files) {
      let destPath: string;

      if (asset.flatten !== false) {
        destPath = join(outDir, basename(file));
      } else {
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
export async function buildService(serviceName: string): Promise<BuildResult> {
  const servicesDir = getServicesDir();
  const servicePath = join(servicesDir, serviceName);
  const startTime = Date.now();

  console.log(`\n📦 Building ${serviceName}...`);

  // Clean dist folder before build
  const distPath = join(servicePath, "dist");
  if (existsSync(distPath)) {
    rmSync(distPath, { recursive: true, force: true });
  }

  const config = readBuildConfig(servicePath, serviceName);
  const entryPath = join(servicePath, config.entryPoint);

  if (!existsSync(entryPath)) {
    console.log(`  ❌ Entry point not found: ${config.entryPoint}`);
    return { name: serviceName, success: false, error: "Entry point not found" };
  }

  const outFile = config.outFile || `dist/${serviceName}.module.js`;

  try {
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

    await copyAssets(servicePath, config.assets);

    const duration = Date.now() - startTime;
    console.log(`  ⏱️  ${duration}ms`);

    return { name: serviceName, success: true, duration };
  } catch (error: any) {
    console.log(`  ❌ Build failed: ${error.message}`);
    return { name: serviceName, success: false, error: error.message };
  }
}

/**
 * Build multiple services
 */
export async function buildServices(
  services: string[],
  parallel: boolean = false
): Promise<BuildResult[]> {
  if (parallel) {
    return Promise.all(services.map(buildService));
  }

  const results: BuildResult[] = [];
  for (const service of services) {
    results.push(await buildService(service));
  }
  return results;
}

/**
 * Print build summary
 */
export function printSummary(results: BuildResult[]) {
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
