import { build } from "esbuild";
import { addJsExtensionPlugin } from "@shopana/build-tools/esbuild";
import { copyFileSync, mkdirSync } from "fs";
import { dirname } from "path";

// Build main entry point
const mainOptions = {
  entryPoints: ["src/index.ts"],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile: "dist/src/index.js",
  packages: "external", // 🔥 ключевая настройка
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
  
  // Copy GraphQL schema files to dist/src/schema (relative to bundled service.js location)
  const schemaFiles = [
    { src: "src/api/schema/base.graphql", dest: "dist/src/schema/base.graphql" },
    { src: "src/api/schema/apps.graphql", dest: "dist/src/schema/apps.graphql" },
  ];
  
  for (const file of schemaFiles) {
    mkdirSync(dirname(file.dest), { recursive: true });
    copyFileSync(file.src, file.dest);
  }
  
  console.log("Build completed successfully");
} catch (error) {
  console.error("Build failed");
  console.error(error);
  process.exitCode = 1;
}
