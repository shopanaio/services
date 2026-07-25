import { readFileSync } from "node:fs";
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import { buildSubgraphSchema } from "@apollo/subgraph";
import fastifyApollo, {
  fastifyApolloDrainPlugin,
} from "@as-integrations/fastify";
import type { AppHostContext } from "@shopana/app-sdk";
import fastify from "fastify";
import { gql } from "graphql-tag";

interface HelloWorldGraphQLContext {
  readonly host: AppHostContext;
}

const resolvers = {
  Query: {
    helloWorldGreeting: (
      _parent: unknown,
      _args: Record<string, never>,
      _context: HelloWorldGraphQLContext,
    ) => ({
      message: "Hello, world!",
      appCode: "hello-world",
    }),
  },
};

function loadSchema() {
  const schemaUrl =
    import.meta.url.includes("/dist/")
      ? new URL("./graphql/admin/hello-world.graphql", import.meta.url)
      : new URL("./schema/hello-world.graphql", import.meta.url);

  return gql(readFileSync(schemaUrl, "utf8"));
}

export async function createAdminGraphQLServer(
  host: AppHostContext,
) {
  const app = fastify({
    disableRequestLogging: true,
  });
  const apollo = new ApolloServer<HelloWorldGraphQLContext>({
    introspection: true,
    schema: buildSubgraphSchema([
      {
        typeDefs: loadSchema(),
        resolvers,
      },
    ]),
    plugins: [
      fastifyApolloDrainPlugin(app),
      ApolloServerPluginInlineTraceDisabled(),
    ],
  });

  await apollo.start();

  await app.register(fastifyApollo(apollo), {
    path: "/graphql",
    context: async () => ({ host }),
  });

  app.get("/healthz", async () => ({
    status: "ok",
    app: "hello-world",
    subgraph: "admin",
  }));

  return app;
}
