import { defineApp } from "@shopana/app-sdk";
import { onlineStoreManifest } from "../app.manifest.js";
import { OnlineStoreApp } from "./OnlineStoreApp.js";

export { onlineStoreManifest } from "../app.manifest.js";
export { OnlineStoreApp } from "./OnlineStoreApp.js";
export * from "./content/repositories/index.js";

export default defineApp({
  manifest: onlineStoreManifest,
  create: (host) => new OnlineStoreApp(host),
});
