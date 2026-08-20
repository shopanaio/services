import { createHash } from "node:crypto";
import { appGraphQL, defineApp } from "@shopana/app-sdk";
import { helloWorldManifest } from "../app.manifest.js";
import { HelloWorldApp } from "./HelloWorldApp.js";

export { helloWorldManifest } from "../app.manifest.js";
export { HelloWorldApp } from "./HelloWorldApp.js";

export default defineApp({
  manifest: helloWorldManifest,
  create: (host) => new HelloWorldApp(host),
  graphql: {
    admin: {
      schema: "./graphql/admin/hello-world.graphql",
      handlers: {
        "Query.helloWorldAppQuery": appGraphQL.handler(() => ({})),
        "HelloWorldAppQuery.helloWorldGreeting": appGraphQL.action("hello"),
        "HelloWorldAppQuery.helloWorldSecretDigest": appGraphQL.handler(
          async (_parent, args, context) => {
            const { name } = args as { name: string };
            const value = await context.host.secrets.resolve(name);
            return {
              sha256: createHash("sha256").update(value).digest("hex"),
            };
          },
        ),
      },
    },
  },
});
