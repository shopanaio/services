import { build } from "esbuild";
import { readdirSync, existsSync } from "fs";
import { join } from "path";

const workflowsDir = "src/workflows";

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

const entries = existsSync(workflowsDir)
  ? readdirSync(workflowsDir)
      .filter((f) => f.endsWith(".workflow.ts"))
      .map((f) => join(workflowsDir, f))
  : [];

async function main() {
  if (entries.length === 0) {
    console.log("No workflow sources found; skipping build.");
    return;
  }
  try {
    await build({
      entryPoints: entries,
      bundle: true,
      platform: "node",
      format: "esm",
      outdir: "dist/workflows",
      outbase: "src/workflows",
      tsconfig: "tsconfig.json",
      external: externalDeps,
    });
    console.log("Workflows build succeeded");
  } catch (err) {
    console.error("Workflows build failed");
    console.error(err);
    process.exitCode = 1;
  }
}

await main();
