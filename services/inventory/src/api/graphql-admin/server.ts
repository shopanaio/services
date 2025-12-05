import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import fastifyApollo, {
  fastifyApolloDrainPlugin,
} from "@as-integrations/fastify";
import fastify from "fastify";
import { readFileSync } from "fs";
import { gql } from "graphql-tag";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { resolvers } from "./resolvers/index.js";
import { buildAdminContextMiddleware } from "./contextMiddleware.js";
import { getContext, type InventoryContext } from "../../context/index.js";

export interface GraphQLContext {
  requestId: string;
  slug: string;
  project: InventoryContext["project"];
  user: InventoryContext["user"];
}

export interface ServerConfig {
  port: number;
  grpcHost?: string;
}

/**
 * Create and start GraphQL-only server
 * Uses admin context middleware that sets async local storage context
 */
export async function startServer(config: ServerConfig) {
  const isDevelopment = process.env.NODE_ENV === "development";

  const app = fastify({
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

  // Load GraphQL schema - use import.meta.url to get correct path when loaded from orchestrator
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const schemaFiles = [
    "relay.graphql",
    "base.graphql",
    "physical.graphql",
    "pricing.graphql",
    "stock.graphql",
    "options.graphql",
    "features.graphql",
    "media.graphql",
    "parent.graphql",
    "variant.graphql",
    "product.graphql",
  ];

  const modules = schemaFiles.map((file) => ({
    typeDefs: gql(readFileSync(join(__dirname, file), "utf-8")),
    resolvers,
  }));

  // Create Apollo Server
  const apollo = new ApolloServer<GraphQLContext>({
    introspection: true,
    schema: buildSubgraphSchema(modules),
    plugins: [fastifyApolloDrainPlugin(app)],
  });

  await apollo.start();

  // Admin context middleware
  const grpcConfig = {
    getGrpcHost: () => config.grpcHost ?? process.env.PLATFORM_GRPC_HOST ?? "localhost:50051",
  };
  app.addHook("preHandler", buildAdminContextMiddleware(grpcConfig));

  // GraphQL endpoint
  await app.register(fastifyApollo(apollo), {
    path: "/graphql",
    context: async (request, _reply): Promise<GraphQLContext> => {
      // For introspection, return minimal context
      const isIntrospection =
        request.headers["x-interpolation"] === "true" ||
        request.headers["user-agent"]?.includes("rover");

      if (isIntrospection) {
        return {
          requestId: request.id as string,
          slug: "",
          project: null as any,
          user: null as any,
        };
      }

      const ctx = getContext();
      return {
        requestId: request.id as string,
        slug: ctx.slug,
        project: ctx.project,
        user: ctx.user,
      };
    },
  });

  // Health check endpoints
  app.get("/", async (_request, reply) => {
    return reply.send({ status: "ok", service: "inventory" });
  });

  app.get("/healthz", async (_request, reply) => {
    return reply.send({ status: "ok", service: "inventory" });
  });

  // Start server
  await app.listen({
    port: config.port,
    host: "0.0.0.0",
  });

  app.log.info(
    `Inventory GraphQL Admin API ready at http://localhost:${config.port}/graphql`
  );

  return app;
}
