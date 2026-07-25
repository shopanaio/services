import { defineApp } from "@shopana/app-sdk";
import { headlessManifest } from "../app.manifest.js";
import { HeadlessApp } from "./HeadlessApp.js";

export {
  HEADLESS_STOREFRONT_CAPABILITY,
  HEADLESS_STOREFRONT_AVAILABLE_PERMISSIONS,
  HEADLESS_STOREFRONT_DEFAULT_PERMISSIONS,
  headlessManifest,
  headlessStorefrontApi,
} from "../app.manifest.js";
export type {
  HeadlessStorefrontPermission,
  StorefrontApiConfiguration,
} from "../app.manifest.js";
export { HeadlessApp } from "./HeadlessApp.js";

export default defineApp({
  manifest: headlessManifest,
  create: (host) => new HeadlessApp(host),
});
