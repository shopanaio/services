import { build } from "esbuild";

const externalDeps = [
  "express",
  "pino",
  "pino-http",
  "js-yaml",
  "@noble/ed25519",
  "dotenv",
  "dotenv/config",
  "http-message-signatures",
];

// Build main index.ts
const mainOptions = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "dist/index.js",
  external: externalDeps,
};

try {
  await build(mainOptions);
  console.log("🎉 Build completed successfully");
} catch (error) {
  console.error("Build failed");
  console.error(error);
  process.exitCode = 1;
}
