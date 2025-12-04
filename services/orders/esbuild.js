import { build } from "esbuild";
import { addJsExtensionPlugin } from "@shopana/build-tools/esbuild";
import { copyFileSync, mkdirSync } from "fs";
import { dirname } from "path";

// Build module entry point for orchestrator
const moduleOptions = {
  entryPoints: ["src/orders.module.ts"],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile: "dist/orders.module.js",
  packages: "external",
  sourcemap: true,
  minify: false,
  plugins: [addJsExtensionPlugin],
};

try {
  await build(moduleOptions);

  // Copy GraphQL schema files to dist/schema/{admin,storefront}
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

  mkdirSync("dist/schema/admin", { recursive: true });
  mkdirSync("dist/schema/storefront", { recursive: true });

  for (const file of adminSchemaFiles) {
    copyFileSync(`src/interfaces/gql-admin-api/schema/${file}`, `dist/schema/admin/${file}`);
  }

  for (const file of storefrontSchemaFiles) {
    copyFileSync(`src/interfaces/gql-storefront-api/schema/${file}`, `dist/schema/storefront/${file}`);
  }

  console.log("Build completed successfully");
} catch (error) {
  console.error("Build failed");
  console.error(error);
  process.exitCode = 1;
}
