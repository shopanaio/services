import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import fastifyApollo, {
  fastifyApolloDrainPlugin,
} from "@as-integrations/fastify";
import Fastify from "fastify";
import { readFileSync } from "fs";
import { gql } from "graphql-tag";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { resolvers } from "./resolvers/index.js";
import { buildAdminContextMiddleware } from "./contextMiddleware.js";
import { getContext, type MediaContext } from "../../context/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface GraphQLContext {
  requestId: string;
  slug: string;
  project: MediaContext["project"];
  user: MediaContext["user"];
}

function loadTypeDefs() {
  const schemaDir = __dirname;
  const files = [
    "relay.graphql",
    "base.graphql",
    "file.graphql",
  ];

  const typeDefs = files.map((file) => {
    const content = readFileSync(join(schemaDir, file), "utf-8");
    return gql(content);
  });

  return typeDefs;
}

export interface ServerConfig {
  port?: number;
  grpcHost?: string;
}

export async function createApolloServer(config: ServerConfig = {}) {
  const isDevelopment = process.env.NODE_ENV === "development";

  const fastify = Fastify({
    logger: isDevelopment
      ? {
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:HH:MM:ss.l",
              ignore: "pid,hostname,reqId,responseTime",
              messageFormat: "[FASTIFY] {msg}",
              levelFirst: true,
            },
          },
        }
      : true,
  });

  const typeDefs = loadTypeDefs();

  const server = new ApolloServer<GraphQLContext>({
    introspection: true,
    schema: buildSubgraphSchema({
      typeDefs,
      resolvers,
    }),
    plugins: [fastifyApolloDrainPlugin(fastify)],
  });

  await server.start();

  // Health check endpoints
  fastify.get("/", async (_request, reply) => {
    return reply.send({ status: "ok", service: "media" });
  });

  fastify.get("/healthz", async (_request, reply) => {
    return reply.send({ status: "ok", service: "media" });
  });

  // GraphQL route group with context middleware
  await fastify.register(async function (graphqlInstance) {
    // Admin context middleware that sets async local storage
    const grpcConfig = {
      getGrpcHost: () => config.grpcHost ?? process.env.PLATFORM_GRPC_HOST ?? "localhost:50051",
    };
    await graphqlInstance.addHook(
      "preHandler",
      buildAdminContextMiddleware(grpcConfig)
    );

    // GraphQL endpoint with context from async local storage
    await graphqlInstance.register(fastifyApollo(server), {
      path: "/graphql",
      context: async (request, _reply): Promise<GraphQLContext> => {
        const ctx = getContext();
        return {
          requestId: request.id as string,
          slug: ctx.slug,
          project: ctx.project,
          user: ctx.user,
        };
      },
    });
  });

  return fastify;
}

export async function startServer(port = 4002) {
  const fastify = await createApolloServer({ port });

  try {
    const address = await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`Media GraphQL Admin API running at ${address}/graphql`);
    return fastify;
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
