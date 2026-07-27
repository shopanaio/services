import { appGraphQL, defineApp } from "@shopana/app-sdk";
import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { headlessManifest } from "../app.manifest.js";
import { HeadlessApp } from "./HeadlessApp.js";
import {
  assertHeadlessAdminAccess,
  createHeadlessResolverContext,
  HeadlessStorefrontConnectionResolver,
  MutationResolver,
  QueryResolver,
  StorefrontCredentialResolver,
} from "./api/graphql-admin/resolvers/index.js";

export {
  HEADLESS_STOREFRONT_DEFAULT_PERMISSIONS,
  headlessManifest,
  headlessStorefrontApi,
} from "../app.manifest.js";
export type { StorefrontApiConfiguration } from "../app.manifest.js";
export {
  STOREFRONT_PERMISSION_CATALOG,
  STOREFRONT_PERMISSIONS,
  STOREFRONT_PERMISSION_VALUES,
} from "@shopana/storefront-permissions";
export type {
  StorefrontPermission,
  StorefrontPermissionAction,
  StorefrontPermissionDefinition,
  StorefrontPermissionRisk,
} from "@shopana/storefront-permissions";
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
          (_parent, _args, context) => {
            assertHeadlessAdminAccess(context, "read");
            return new QueryResolver(
              {},
              createHeadlessResolverContext(context),
            ).headlessAppQuery();
          },
        ),
        "Mutation.headlessAppMutation": appGraphQL.handler(
          (_parent, _args, context) => {
            assertHeadlessAdminAccess(context, "write");
            return new MutationResolver(
              {},
              createHeadlessResolverContext(context),
            ).headlessAppMutation();
          },
        ),
        "HeadlessStorefrontConnection.__resolveReference":
          appGraphQL.handler((parent, _args, context) => {
            assertHeadlessAdminAccess(context, "read");
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
            assertHeadlessAdminAccess(context, "read");
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
    storefront: {
      schema: "./graphql/storefront/headless.graphql",
      handlers: {
        "Query.headlessStorefrontAccess": appGraphQL.handler(() => true),
      },
    },
  },
});
