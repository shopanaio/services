import { defineApp } from "@shopana/app-sdk";
import { helloWorldManifest } from "../app.manifest.js";
import { HelloWorldApp } from "./HelloWorldApp.js";

export { helloWorldManifest } from "../app.manifest.js";
export { HelloWorldApp } from "./HelloWorldApp.js";

export default defineApp({
  manifest: helloWorldManifest,
  create: (host) => new HelloWorldApp(host),
});
