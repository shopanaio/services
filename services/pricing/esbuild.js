import { build } from "esbuild";
import { addJsExtensionPlugin } from "@shopana/build-tools/esbuild";

// Build main entry point
const mainOptions = {
  entryPoints: ["src/index.ts"],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile: "dist/src/index.js",
  packages: "external",
  sourcemap: true,
  minify: false,
  plugins: [addJsExtensionPlugin],
};

// Build service entry point for orchestrator
const serviceOptions = {
  entryPoints: ["src/service.ts"],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile: "dist/src/service.js",
  packages: "external",
  sourcemap: true,
  minify: false,
  plugins: [addJsExtensionPlugin],
};

try {
  await build(mainOptions);
  await build(serviceOptions);
  console.log("Build completed successfully");
} catch (error) {
  console.error("Build failed");
  console.error(error);
  process.exitCode = 1;
}
