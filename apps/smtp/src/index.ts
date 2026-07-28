import { appGraphQL, defineApp } from "@shopana/app-sdk";
import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { smtpManifest } from "../app.manifest.js";
import { SmtpApp } from "./SmtpApp.js";
import {
  assertSmtpAdminAccess,
  createSmtpResolverContext,
  MutationResolver,
  QueryResolver,
  SmtpConnectionResolver,
} from "./api/graphql-admin/resolvers/index.js";

export { smtpManifest } from "../app.manifest.js";
export {
  parseSmtpConfiguration,
  type SmtpConfiguration,
  validateSmtpPassword,
} from "./configuration.js";
export { SmtpApp } from "./SmtpApp.js";
export * from "./connections/index.js";

export default defineApp({
  manifest: smtpManifest,
  create: (host) => new SmtpApp(host),
  graphql: {
    admin: {
      schema: "./graphql/admin/smtp.graphql",
      handlers: {
        "Query.smtpAppQuery": appGraphQL.handler(
          (_parent, _args, context) => {
            assertSmtpAdminAccess(context, "read");
            return new QueryResolver(
              {},
              createSmtpResolverContext(context),
            ).smtpAppQuery();
          },
        ),
        "Mutation.smtpAppMutation": appGraphQL.handler(
          (_parent, _args, context) => {
            assertSmtpAdminAccess(context, "write");
            return new MutationResolver(
              {},
              createSmtpResolverContext(context),
            ).smtpAppMutation();
          },
        ),
        "SmtpConnection.__resolveReference": appGraphQL.handler(
          (parent, _args, context) => {
            assertSmtpAdminAccess(context, "read");
            const reference = parent as { id?: unknown };
            if (typeof reference.id !== "string") return null;
            try {
              const id = decodeGlobalIdByType(
                reference.id,
                GlobalIdEntity.SmtpConnection,
              );
              return new SmtpConnectionResolver(
                id,
                createSmtpResolverContext(context),
              );
            } catch {
              return null;
            }
          },
        ),
      },
    },
  },
});
