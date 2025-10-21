import esbuild from "esbuild";
import { buildService } from "@shopana/build-tools";

await buildService({
  entryPoints: ["src/index.ts"],
  outdir: "dist",
  platform: "node",
  format: "esm",
  target: "node20",
  bundle: true,
  sourcemap: true,
  minify: false,
  external: [
    "pg-native",
    "better-sqlite3",
    "mysql",
    "mysql2",
    "oracledb",
    "tedious",
  ],
});
