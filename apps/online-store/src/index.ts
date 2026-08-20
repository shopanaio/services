import { appGraphQL, defineApp } from "@shopana/app-sdk";
import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { onlineStoreManifest } from "../app.manifest.js";
import { OnlineStoreApp } from "./OnlineStoreApp.js";
import {
  assertOnlineStoreAdminAccess,
  createOnlineStoreResolverContext,
  MutationResolver,
  NavigationMenuItemResolver,
  NavigationMenuResolver,
  PageResolver,
  QueryResolver,
} from "./api/graphql-admin/resolvers/index.js";

export { onlineStoreManifest } from "../app.manifest.js";
export { OnlineStoreApp } from "./OnlineStoreApp.js";
export * from "./content/repositories/index.js";

export default defineApp({
  manifest: onlineStoreManifest,
  create: (host) => new OnlineStoreApp(host),
  graphql: {
    admin: {
      schema: [
        "./graphql/admin/base.graphql",
        "./graphql/admin/scalars.graphql",
        "./graphql/admin/relay.graphql",
        "./graphql/admin/page.graphql",
        "./graphql/admin/navigation.graphql",
        "./graphql/admin/__generated__/filters.graphql",
      ],
      handlers: {
        "Query.onlineStoreAppQuery": appGraphQL.handler((_parent, _args, context) => {
          assertOnlineStoreAdminAccess(context, "read");
          return new QueryResolver(
            {},
            createOnlineStoreResolverContext(context),
          ).onlineStoreAppQuery();
        }),
        "Mutation.onlineStoreAppMutation": appGraphQL.handler((_parent, _args, context) => {
          assertOnlineStoreAdminAccess(context, "write");
          return new MutationResolver(
            {},
            createOnlineStoreResolverContext(context),
          ).onlineStoreAppMutation();
        }),
        "OnlineStorePage.__resolveReference": appGraphQL.handler((parent, _args, context) => {
          assertOnlineStoreAdminAccess(context, "read");
          const id = referenceId(parent, GlobalIdEntity.OnlineStorePage);
          return id ? new PageResolver(id, createOnlineStoreResolverContext(context)) : null;
        }),
        "OnlineStoreNavigationMenu.__resolveReference": appGraphQL.handler(
          (parent, _args, context) => {
            assertOnlineStoreAdminAccess(context, "read");
            const id = referenceId(parent, GlobalIdEntity.OnlineStoreNavigationMenu);
            return id
              ? new NavigationMenuResolver(id, createOnlineStoreResolverContext(context))
              : null;
          },
        ),
        "OnlineStoreNavigationMenuItem.__resolveReference": appGraphQL.handler(
          (parent, _args, context) => {
            assertOnlineStoreAdminAccess(context, "read");
            const id = referenceId(parent, GlobalIdEntity.OnlineStoreNavigationMenuItem);
            return id
              ? new NavigationMenuItemResolver(id, createOnlineStoreResolverContext(context))
              : null;
          },
        ),
      },
    },
  },
});

function referenceId(parent: unknown, type: GlobalIdType): string | null {
  const reference = parent as { readonly id?: unknown };
  if (typeof reference.id !== "string") return null;
  try {
    return decodeGlobalIdByType(reference.id, type);
  } catch {
    return null;
  }
}
