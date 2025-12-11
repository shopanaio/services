import { addJsExtensionPlugin } from "@shopana/build-tools/esbuild";
import { build } from "esbuild";
import { copyFileSync, cpSync, mkdirSync } from "fs";

// Build module entry point for orchestrator
const moduleOptions = {
  entryPoints: ["src/inventory.module.ts"],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile: "dist/inventory.module.js",
  packages: "external",
  sourcemap: true,
  minify: false,
  plugins: [addJsExtensionPlugin],
};

try {
  await build(moduleOptions);

  // Copy GraphQL schema files to dist/ (same dir as bundled module)
  const schemaFiles = [
    "relay.graphql",
    "base.graphql",
    "physical.graphql",
    "pricing.graphql",
    "stock.graphql",
    "options.graphql",
    "features.graphql",
    "media.graphql",
    "variant.graphql",
    "product.graphql",
  ];

  const generatedSchemaFiles = [
    "base-filters.graphql",
    "warehouse-filters.graphql",
    "warehouse-stock-filters.graphql",
  ];

  mkdirSync("dist/schema", { recursive: true });
  mkdirSync("dist/schema/__generated__", { recursive: true });

  for (const file of schemaFiles) {
    const src = `src/api/graphql-admin/schema/${file}`;
    const dest = `dist/schema/${file}`;
    copyFileSync(src, dest);
  }

  for (const file of generatedSchemaFiles) {
    const src = `src/api/graphql-admin/schema/__generated__/${file}`;
    const dest = `dist/schema/__generated__/${file}`;
    copyFileSync(src, dest);
  }

  // Copy migrations folder to dist/
  cpSync("migrations", "dist/migrations", { recursive: true });

  console.log("Build completed successfully");
} catch (error) {
  console.error("Build failed");
  console.error(error);
  process.exitCode = 1;
}
