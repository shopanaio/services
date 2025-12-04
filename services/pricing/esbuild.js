import { build } from "esbuild";
import { addJsExtensionPlugin } from "@shopana/build-tools/esbuild";

// Build module entry point for orchestrator
const moduleOptions = {
  entryPoints: ["src/pricing.module.ts"],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile: "dist/pricing.module.js",
  packages: "external",
  sourcemap: true,
  minify: false,
  plugins: [addJsExtensionPlugin],
};

try {
  await build(moduleOptions);
  console.log("Build completed successfully");
} catch (error) {
  console.error("Build failed");
  console.error(error);
  process.exitCode = 1;
}
