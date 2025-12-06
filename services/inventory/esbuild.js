import { build } from "esbuild";
import { addJsExtensionPlugin } from "@shopana/build-tools/esbuild";
import { copyFileSync, mkdirSync, cpSync } from "fs";
import { dirname } from "path";

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

  mkdirSync("dist", { recursive: true });
  for (const file of schemaFiles) {
    const src = `src/api/graphql-admin/${file}`;
    const dest = `dist/${file}`;
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
