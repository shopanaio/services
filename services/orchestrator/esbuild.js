import { build } from "esbuild";
import { addJsExtensionPlugin } from "@shopana/build-tools/esbuild";

await build({
  entryPoints: ["src/main.ts"],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile: "dist/main.js",
  packages: "external",
  sourcemap: true,
  minify: false,
  plugins: [addJsExtensionPlugin],
});

console.log("Build completed successfully");
