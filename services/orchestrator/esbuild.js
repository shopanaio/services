import { build } from "esbuild";
import { addJsExtensionPlugin } from "@shopana/build-tools/esbuild";

// Build main entry points
const mainOptions = {
  entryPoints: ["src/index.ts", "src/nest-orchestrator.ts"],
  platform: "node",
  bundle: true,
  format: "esm",
  outdir: "dist/src",
  packages: "external", // 🔥 ключевая настройка
  sourcemap: true,
  minify: false,
  plugins: [addJsExtensionPlugin],
};

try {
  await build(mainOptions);
  console.log("Build completed successfully");
} catch (error) {
  console.error("Build failed");
  console.error(error);
  process.exitCode = 1;
}
