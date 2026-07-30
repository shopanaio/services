import { defineApp } from "@shopana/app-sdk";
import { bundlesManifest } from "../app.manifest.js";
import { BundlesApp } from "./BundlesApp.js";

export { bundlesManifest } from "../app.manifest.js";
export { BundlesApp } from "./BundlesApp.js";

export default defineApp({
  manifest: bundlesManifest,
  create: (host) => new BundlesApp(host),
});
