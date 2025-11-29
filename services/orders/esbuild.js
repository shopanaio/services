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

  // Copy GraphQL schema files to dist/src/interfaces/
  const { copyFileSync, mkdirSync } = await import("fs");
  const { dirname } = await import("path");

  const adminSchemaFiles = [
    "base.graphql",
    "country.graphql",
    "currency.graphql",
    "order.graphql",
    "parent.graphql",
    "purchasable.graphql",
  ];

  const storefrontSchemaFiles = [
    "base.graphql",
    "country.graphql",
    "currency.graphql",
    "order.graphql",
    "parent.graphql",
  ];

  for (const file of adminSchemaFiles) {
    const src = `src/interfaces/gql-admin-api/schema/${file}`;
    // Copy to dist/gql-admin-api/schema/ (relative to bundled service.js at dist/src/)
    const dest = `dist/gql-admin-api/schema/${file}`;
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }

  for (const file of storefrontSchemaFiles) {
    const src = `src/interfaces/gql-storefront-api/schema/${file}`;
    // Copy to dist/gql-storefront-api/schema/ (relative to bundled service.js at dist/src/)
    const dest = `dist/gql-storefront-api/schema/${file}`;
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }

  console.log("Build completed successfully");
} catch (error) {
  console.error("Build failed");
  console.error(error);
  process.exitCode = 1;
}
