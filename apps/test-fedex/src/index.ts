import { defineApp } from "@shopana/app-sdk";
import { testFedexManifest } from "../app.manifest.js";
import { TestFedexApp } from "./TestFedexApp.js";

export { testFedexManifest } from "../app.manifest.js";
export { TestFedexApp } from "./TestFedexApp.js";

export default defineApp({
  manifest: testFedexManifest,
  create: (host) => new TestFedexApp(host),
});
