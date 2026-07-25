import type {
  AppHostContext,
  AppManifest,
  ShopanaAppDefinition,
} from "@shopana/app-sdk";
import {
  headlessManifest,
  type HeadlessAppManifest,
} from "../app.manifest.js";
import { HeadlessApp } from "./HeadlessApp.js";

export {
  HEADLESS_STOREFRONT_AVAILABLE_PERMISSIONS,
  HEADLESS_STOREFRONT_DEFAULT_PERMISSIONS,
  HEADLESS_STOREFRONT_SPECIFICATION_HANDLE,
  headlessManifest,
} from "../app.manifest.js";
export type {
  HeadlessAppManifest,
  HeadlessSalesChannelSpecification,
  HeadlessStorefrontPermission,
  StorefrontApiSpecification,
} from "../app.manifest.js";
export { HeadlessApp } from "./HeadlessApp.js";

/**
 * The shared SDK does not expose `storefrontApi` yet. The base manifest is
 * validated through `defineAppManifest`; this narrow compatibility bridge
 * preserves the additional Headless contract until the platform SDK adopts it.
 */
const definition = Object.freeze({
  manifest: headlessManifest as HeadlessAppManifest & AppManifest,
  create: (host: AppHostContext) => new HeadlessApp(host),
}) satisfies ShopanaAppDefinition;

export default definition;
