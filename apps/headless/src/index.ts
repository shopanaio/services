import { appGraphQL, defineApp } from "@shopana/app-sdk";
import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { headlessManifest } from "../app.manifest.js";
import { HeadlessApp } from "./HeadlessApp.js";
import {
  createHeadlessResolverContext,
  HeadlessStorefrontConnectionResolver,
  QueryResolver,
  StorefrontCredentialResolver,
} from "./api/graphql-admin/resolvers/index.js";

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
        "Query.headlessAppQuery": appGraphQL.handler(
          (_parent, _args, context) =>
            new QueryResolver(
              {},
              createHeadlessResolverContext(context),
            ).headlessAppQuery(),
        ),
        "HeadlessStorefrontConnection.__resolveReference":
          appGraphQL.handler((parent, _args, context) => {
            const reference = parent as { id?: unknown };
            if (typeof reference.id !== "string") {
              return null;
            }
            try {
              const id = decodeGlobalIdByType(
                reference.id,
                GlobalIdEntity.HeadlessStorefrontConnection,
              );
              return new HeadlessStorefrontConnectionResolver(
                id,
                createHeadlessResolverContext(context),
              );
            } catch {
              return null;
            }
          }),
        "StorefrontCredential.__resolveReference":
          appGraphQL.handler((parent, _args, context) => {
            const reference = parent as { id?: unknown };
            if (typeof reference.id !== "string") {
              return null;
            }
            try {
              const id = decodeGlobalIdByType(
                reference.id,
                GlobalIdEntity.StorefrontCredential,
              );
              return new StorefrontCredentialResolver(
                id,
                createHeadlessResolverContext(context),
              );
            } catch {
              return null;
            }
          }),
      },
    },
  },
});
