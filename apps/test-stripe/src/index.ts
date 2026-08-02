import { defineApp } from "@shopana/app-sdk";
import { testStripeManifest } from "../app.manifest.js";
import { TestStripeApp } from "./TestStripeApp.js";

export { testStripeManifest } from "../app.manifest.js";
export { TestStripeApp } from "./TestStripeApp.js";

export default defineApp({
  manifest: testStripeManifest,
  create: (host) => new TestStripeApp(host),
});
