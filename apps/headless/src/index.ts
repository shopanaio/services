import { appGraphQL, defineApp } from "@shopana/app-sdk";
import { headlessManifest } from "../app.manifest.js";
import { HeadlessApp } from "./HeadlessApp.js";

export {
  HEADLESS_STOREFRONT_CAPABILITY,
  HEADLESS_STOREFRONT_AVAILABLE_PERMISSIONS,
  HEADLESS_STOREFRONT_DEFAULT_PERMISSIONS,
  HEADLESS_STOREFRONT_PERMISSION_CATALOG,
  headlessManifest,
  headlessStorefrontApi,
} from "../app.manifest.js";
export type {
  HeadlessStorefrontPermissionAction,
  HeadlessStorefrontPermissionDefinition,
  HeadlessStorefrontPermissionRisk,
  HeadlessStorefrontPermission,
  StorefrontApiConfiguration,
} from "../app.manifest.js";
export { HeadlessApp } from "./HeadlessApp.js";
export * from "./storefront-access/repositories/index.js";

export default defineApp({
  manifest: headlessManifest,
  create: (host) => new HeadlessApp(host),
  graphql: {
    admin: {
      schema: "./graphql/admin/headless.graphql",
      handlers: {
        "Query.headlessAppQuery": appGraphQL.handler(() => ({})),
        "HeadlessAppQuery.headlessStorefrontPermissionCatalog":
          appGraphQL.action("permissionCatalog"),
      },
    },
  },
});
