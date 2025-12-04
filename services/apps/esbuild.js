import { build } from "esbuild";
import { addJsExtensionPlugin } from "@shopana/build-tools/esbuild";
import { copyFileSync, mkdirSync } from "fs";
import { dirname } from "path";

// Build module entry point for orchestrator
const moduleOptions = {
  entryPoints: ["src/apps.module.ts"],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile: "dist/apps.module.js",
  packages: "external",
  sourcemap: true,
  minify: false,
  plugins: [addJsExtensionPlugin],
};

try {
  await build(moduleOptions);
  
  // Copy GraphQL schema files to dist/schema (server.ts uses join(__dirname, "schema"))
  const schemaFiles = ["base.graphql", "apps.graphql"];

  mkdirSync("dist/schema", { recursive: true });
  for (const file of schemaFiles) {
    copyFileSync(`src/api/schema/${file}`, `dist/schema/${file}`);
  }
  
  console.log("Build completed successfully");
} catch (error) {
  console.error("Build failed");
  console.error(error);
  process.exitCode = 1;
}
