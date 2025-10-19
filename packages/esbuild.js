import { build } from "esbuild";
import {
  readFileSync,
  existsSync,
  readdirSync,
  statSync,
  rmSync,
  mkdirSync,
} from "fs";
import { join, dirname, basename, relative } from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";
import { addJsExtensionPlugin } from "@shopana/build-tools/esbuild";

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Check if script is called from a specific package or from packages root
const callerDir = process.cwd();
const isCalledFromPackage = basename(dirname(callerDir)) === "packages";
const packagesRoot = isCalledFromPackage ? dirname(callerDir) : __dirname;

/**
 * Get all package directories
 */
function getPackages() {
  const packagesDir = __dirname;
  return readdirSync(packagesDir)
    .filter((name) => {
      const packagePath = join(packagesDir, name);
      return (
        statSync(packagePath).isDirectory() &&
        existsSync(join(packagePath, "package.json"))
      );
    })
    .map((name) => join(packagesDir, name));
}

/**
 * Get entry points from package.json exports field
 */
function getEntryPoints(packageDir) {
  const packageJsonPath = join(packageDir, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

  const entryPoints = {};

  // Check if exports field exists
  if (packageJson.exports) {
    for (const [key, value] of Object.entries(packageJson.exports)) {
      // Skip package.json exports
      if (key.includes("package.json")) {
        continue;
      }

      // Get the path without the './' prefix
      const exportName = key === "." ? "index" : key.replace("./", "");

      // Get the source file path
      const distPath =
        typeof value === "string" ? value : value.default || value.require;
      if (distPath) {
        // Convert dist path to src path: dist/foo.js -> src/foo.ts
        const srcPath = distPath
          .replace(/^\.\/dist\//, "src/")
          .replace(/\.js$/, ".ts");
        const fullSrcPath = join(packageDir, srcPath);

        if (existsSync(fullSrcPath)) {
          entryPoints[exportName] = fullSrcPath;
        }
      }
    }
  }

  // Fallback: if no exports or no entry points found, use src/index.ts
  if (Object.keys(entryPoints).length === 0) {
    const indexPath = join(packageDir, "src/index.ts");
    if (existsSync(indexPath)) {
      entryPoints["index"] = indexPath;
    }
  }

  return entryPoints;
}

/**
 * Get all .d.ts files recursively from a directory
 */
function getDtsFiles(dir, files = []) {
  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      getDtsFiles(fullPath, files);
    } else if (entry.name.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Generate TypeScript declarations bundle for a package using API Extractor
 */
async function generateDeclarations(packageDir, entryPoints) {
  console.log(`  Generating TypeScript declarations...`);

  const finalDistDir = join(packageDir, "dist");

  try {
    // Step 1: Generate individual .d.ts files with tsc
    await execAsync("yarn tsc --emitDeclarationOnly", { cwd: packageDir });
    console.log(`  ✅ TypeScript declarations generated`);

    // Step 2: Bundle .d.ts files for each entry point using API Extractor
    console.log(`  Bundling TypeScript declarations with API Extractor...`);

    const { Extractor, ExtractorConfig } = await import("@microsoft/api-extractor");

    const entryPointNames = Object.keys(entryPoints);

    for (const entryName of entryPointNames) {
      const srcPath = entryPoints[entryName];

      // Get relative path from src directory
      const srcDir = join(packageDir, "src");
      const relativePathFromSrc = relative(srcDir, srcPath);

      // Build path to generated .d.ts file
      const dtsInputPath = join(
        finalDistDir,
        relativePathFromSrc.replace(/\.ts$/, ".d.ts")
      );

      const dtsOutputPath = join(finalDistDir, `${entryName}.d.ts`);

      if (!existsSync(dtsInputPath)) {
        console.warn(
          `  ⚠️  Declaration file not found: ${dtsInputPath}, skipping bundle`
        );
        continue;
      }

      try {
        // Create API Extractor configuration
        const extractorConfig = ExtractorConfig.prepare({
          configObject: {
            projectFolder: packageDir,
            mainEntryPointFilePath: dtsInputPath,
            compiler: {
              tsconfigFilePath: join(packageDir, "tsconfig.json"),
            },
            apiReport: {
              enabled: false,
            },
            docModel: {
              enabled: false,
            },
            dtsRollup: {
              enabled: true,
              untrimmedFilePath: dtsOutputPath,
            },
            tsdocMetadata: {
              enabled: false,
            },
            messages: {
              compilerMessageReporting: {
                default: {
                  logLevel: "warning",
                },
              },
              extractorMessageReporting: {
                default: {
                  logLevel: "warning",
                },
                "ae-missing-release-tag": {
                  logLevel: "none",
                },
                "ae-forgotten-export": {
                  logLevel: "none",
                },
              },
            },
          },
          configObjectFullPath: undefined,
          packageJsonFullPath: join(packageDir, "package.json"),
        });

        // Run API Extractor
        const extractorResult = Extractor.invoke(extractorConfig, {
          localBuild: true,
          showVerboseMessages: false,
        });

        if (extractorResult.succeeded) {
          console.log(`  ✅ Bundled ${entryName}.d.ts`);
        } else {
          console.error(
            `  ⚠️  API Extractor completed with ${extractorResult.errorCount} errors and ${extractorResult.warningCount} warnings for ${entryName}.d.ts`
          );
        }
      } catch (error) {
        console.error(
          `  ⚠️  Failed to bundle ${entryName}.d.ts: ${error.message}`
        );
        // Keep the original file if bundling fails
      }
    }

    // Step 3: Clean up intermediate .d.ts files (keep only the bundled ones)
    const allDtsFiles = getDtsFiles(finalDistDir);
    const bundledFiles = entryPointNames.map((name) =>
      join(finalDistDir, `${name}.d.ts`)
    );

    for (const dtsFile of allDtsFiles) {
      const normalizedPath = dtsFile.replace(/\\/g, "/");
      const isBundled = bundledFiles.some(
        (bundled) => bundled.replace(/\\/g, "/") === normalizedPath
      );

      if (!isBundled) {
        try {
          rmSync(dtsFile);
          // Also remove .d.ts.map files if they exist
          const mapFile = `${dtsFile}.map`;
          if (existsSync(mapFile)) {
            rmSync(mapFile);
          }
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
    }

    // Step 4: Remove .d.ts.map files for bundled files (they're not needed after bundling)
    for (const entryName of entryPointNames) {
      const mapFile = join(finalDistDir, `${entryName}.d.ts.map`);
      if (existsSync(mapFile)) {
        try {
          rmSync(mapFile);
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
    }

    console.log(`  ✅ Declaration bundles completed`);
  } catch (error) {
    console.error(`  Failed to generate declarations: ${error.message}`);
    throw error;
  }
}

/**
 * Build a single package
 */
async function buildPackage(packageDir) {
  const packageJson = JSON.parse(
    readFileSync(join(packageDir, "package.json"), "utf-8")
  );
  const packageName = packageJson.name;

  console.log(`\n📦 Building ${packageName}...`);

  const entryPoints = getEntryPoints(packageDir);

  if (Object.keys(entryPoints).length === 0) {
    console.log(`  ⚠️  No entry points found, skipping`);
    return;
  }

  console.log(`  Entry points:`, Object.keys(entryPoints));

  // Build options
  const buildOptions = {
    entryPoints: Object.values(entryPoints),
    platform: "node",
    bundle: true, // Bundle code but keep external packages separate
    format: "esm",
    outdir: join(packageDir, "dist"),
    outExtension: { ".js": ".js" },
    packages: "external", // Don't bundle node_modules dependencies
    sourcemap: true,
    minify: false,
    plugins: [addJsExtensionPlugin],
    entryNames: "[dir]/[name]",
  };

  try {
    await build(buildOptions);
    console.log(`  ✅ JavaScript build completed`);

    // Generate TypeScript declarations
    await generateDeclarations(packageDir, entryPoints);
  } catch (error) {
    console.error(`  ❌ Build failed:`, error);
    throw error;
  }
}

/**
 * Main build function for all packages
 */
async function buildAll() {
  const packages = getPackages();

  console.log(`Found ${packages.length} packages to build\n`);

  const errors = [];

  for (const packageDir of packages) {
    try {
      await buildPackage(packageDir);
    } catch (error) {
      errors.push({ packageDir, error });
    }
  }

  console.log("\n" + "=".repeat(50));
  if (errors.length > 0) {
    console.log(`\n❌ Build completed with ${errors.length} error(s):\n`);
    errors.forEach(({ packageDir, error }) => {
      console.log(`  - ${packageDir}: ${error.message}`);
    });
    process.exitCode = 1;
  } else {
    console.log("\n✅ All packages built successfully!");
  }
}

/**
 * Main build function for a single package
 */
async function buildSingle() {
  try {
    await buildPackage(callerDir);
    console.log("\n✅ Package built successfully!");
  } catch (error) {
    console.error("\n❌ Build failed:", error);
    process.exitCode = 1;
  }
}

// Run build based on context
if (isCalledFromPackage) {
  // Called from a specific package directory
  buildSingle().catch((error) => {
    console.error("Fatal error:", error);
    process.exitCode = 1;
  });
} else {
  // Called from packages root directory - build all
  buildAll().catch((error) => {
    console.error("Fatal error:", error);
    process.exitCode = 1;
  });
}
