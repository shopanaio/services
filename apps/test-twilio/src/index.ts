import { defineApp } from "@shopana/app-sdk";
import { testTwilioManifest } from "../app.manifest.js";
import { TestTwilioApp } from "./TestTwilioApp.js";

export { testTwilioManifest } from "../app.manifest.js";
export { TestTwilioApp } from "./TestTwilioApp.js";
export default defineApp({
  manifest: testTwilioManifest,
  create: (host) => new TestTwilioApp(host),
});
