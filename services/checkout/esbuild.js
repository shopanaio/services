import { build } from "esbuild";
import { addJsExtensionPlugin } from "@shopana/build-tools/esbuild";
import { copyFileSync, mkdirSync } from "fs";
import { dirname } from "path";

// Build module entry point for orchestrator
const moduleOptions = {
  entryPoints: ["src/checkout.module.ts"],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile: "dist/checkout.module.js",
  packages: "external",
  sourcemap: true,
  minify: false,
  plugins: [addJsExtensionPlugin],
};

try {
  await build(moduleOptions);

  // Copy GraphQL schema files to dist/schema (same pattern as orders service)
  const storefrontSchemaFiles = [
    "parent.graphql",
    "base.graphql",
    "checkout.graphql",
    "checkoutLine.graphql",
    "checkoutDelivery.graphql",
    "checkoutPayment.graphql",
    "currency.graphql",
    "country.graphql",
  ];

  mkdirSync("dist/schema", { recursive: true });
  for (const file of storefrontSchemaFiles) {
    copyFileSync(`src/interfaces/gql-storefront-api/schema/${file}`, `dist/schema/${file}`);
  }

  console.log("Build completed successfully");
} catch (error) {
  console.error("Build failed");
  console.error(error);
  process.exitCode = 1;
}
