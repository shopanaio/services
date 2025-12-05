import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import fastifyApollo, {
  fastifyApolloDrainPlugin,
} from "@as-integrations/fastify";
import fastify from "fastify";
import { readFileSync } from "fs";
import { gql } from "graphql-tag";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type { MediaContext } from "../../context/index.js";
import { runMigrations } from "../../infrastructure/db/migrate.js";
import { buildAdminContextMiddleware } from "./contextMiddleware.js";
import { mediaContextPlugin } from "./mediaContextPlugin.js";
import { resolvers } from "./resolvers/index.js";
import { getServices } from "./services.js";
import { createDataLoaders, type DataLoaders } from "./dataloaders.js";

export interface GraphQLContext {
  requestId: string;
  slug: string;
  project: MediaContext["project"];
  user: MediaContext["user"];
  loaders: DataLoaders | null;
}

export interface ServerConfig {
  port: number;
  grpcHost?: string;
  databaseUrl: string;
}

/**
 * Create and start GraphQL-only server
 * Uses admin context middleware that sets async local storage context
 */
export async function startServer(serverConfig: ServerConfig) {
  const isDevelopment = process.env.NODE_ENV === "development";

  // Run migrations on startup
  console.log("[media] Running database migrations...");
  await runMigrations(serverConfig.databaseUrl);
  console.log("[media] Database migrations completed");

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
  const schemaFiles = ["relay.graphql", "base.graphql", "file.graphql"];

  const modules = schemaFiles.map((file) => ({
    typeDefs: gql(readFileSync(join(__dirname, file), "utf-8")),
    resolvers,
  }));

  // Create Apollo Server
  const apollo = new ApolloServer<GraphQLContext>({
    introspection: true,
    schema: buildSubgraphSchema(modules),
    plugins: [fastifyApolloDrainPlugin(app), mediaContextPlugin()],
  });

  await apollo.start();

  // Admin context middleware
  const grpcConfig = {
    getGrpcHost: () =>
      serverConfig.grpcHost ?? process.env.PLATFORM_GRPC_HOST ?? "localhost:50051",
  };
  app.addHook("preHandler", buildAdminContextMiddleware(grpcConfig));

  // GraphQL endpoint
  await app.register(fastifyApollo(apollo), {
    path: "/graphql/admin",

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
          loaders: null,
        };
      }

      // Create DataLoaders for this request
      const services = getServices();
      const loaders = createDataLoaders(
        request.project.id,
        services.repository
      );

      return {
        requestId: request.id as string,
        slug: request.headers["x-pj-key"] as string,
        project: request.project,
        user: request.user,
        loaders,
      };
    },
  });

  // Health check endpoints
  app.get("/", async (_request, reply) => {
    return reply.send({ status: "ok", service: "media" });
  });

  app.get("/healthz", async (_request, reply) => {
    return reply.send({ status: "ok", service: "media" });
  });

  // Start server
  await app.listen({
    port: serverConfig.port,
    host: "0.0.0.0",
  });

  app.log.info(
    `Media GraphQL Admin API ready at http://localhost:${serverConfig.port}/graphql`
  );

  return app;
}
