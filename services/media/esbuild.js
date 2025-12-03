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

  // Copy GraphQL schema files to dist/src/api/graphql-admin/
  // (relative to bundled service.js location at dist/src/service.js)
  const schemaFiles = [
    "relay.graphql",
    "base.graphql",
    "file.graphql",
  ];

  for (const file of schemaFiles) {
    const src = `src/api/graphql-admin/${file}`;
    const dest = `dist/src/api/graphql-admin/${file}`;
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }

  console.log("Build completed successfully");
} catch (error) {
  console.error("Build failed");
  console.error(error);
  process.exitCode = 1;
}
