import { ApolloServer, type ApolloServerPlugin } from "@apollo/server";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import { buildSubgraphSchema } from "@apollo/subgraph";
import fastifyApollo, {
  fastifyApolloDrainPlugin,
} from "@as-integrations/fastify";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gql } from "graphql-tag";
import { setContext, type ServiceContext } from "../../context/index.js";
import type { Kernel } from "../../kernel/Kernel.js";
import { Loader } from "../../loaders/Loader.js";
import { buildAdminContextMiddleware } from "./contextMiddleware.js";
import { resolvers } from "./resolvers/index.js";

export interface AdminGraphqlPluginOptions {
  kernel: Kernel;
  rootApp: FastifyInstance;
}

const timingPlugin: ApolloServerPlugin<ServiceContext> = {
  async requestDidStart({ request }) {
    const start = performance.now();
    return {
      async willSendResponse() {
        const ms = (performance.now() - start).toFixed(0);
        console.log(`[IAM] ${request.operationName ?? "query"}: ${ms}ms`);
      },
    };
  },
};

/** Admin GraphQL is an encapsulated sibling of the public auth HTTP plugin. */
export const adminGraphqlPlugin: FastifyPluginAsync<
  AdminGraphqlPluginOptions
> = async (instance, options) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const schemaFiles = [
    "shared-locale.graphql",
    "shared-currency.graphql",
    "shared-units.graphql",
    "relay.graphql",
    "base.graphql",
    "media.graphql",
    "user.graphql",
    "session.graphql",
    "role.graphql",
    "organization.graphql",
    "membership.graphql",
  ];
  const modules = schemaFiles.map((file) => ({
    typeDefs: gql(readFileSync(join(__dirname, "schema", file), "utf-8")),
    resolvers,
  }));
  const apollo = new ApolloServer<ServiceContext>({
    introspection: true,
    schema: buildSubgraphSchema(modules as any),
    plugins: [
      fastifyApolloDrainPlugin(options.rootApp),
      timingPlugin,
      ApolloServerPluginInlineTraceDisabled(),
    ],
  });
  await apollo.start();

  instance.addHook("preHandler", buildAdminContextMiddleware());
  await instance.register(fastifyApollo(apollo), {
    path: "/graphql",
    context: async (request, _reply): Promise<ServiceContext> => {
      const ctx: ServiceContext = {
        requestId: request.id as string,
        kernel: options.kernel,
        currentUser: request.currentUser,
        loaders: new Loader(options.kernel.repository),
        requestHeaders: {
          userAgent: request.headers["user-agent"],
          // Fastify resolves this through the listener's explicit trustProxy policy.
          ipAddress: request.ip,
        },
      };
      setContext(ctx);
      return ctx;
    },
  });
};
