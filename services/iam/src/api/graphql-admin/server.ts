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
import {
  getServiceConfig,
  isDevelopment,
} from "@shopana/shared-service-config";
import { setContext, type ServiceContext } from "../../context/index.js";
import { Loader } from "../../loaders/Loader.js";

const { global } = getServiceConfig("iam");
import { Kernel } from "../../kernel/Kernel.js";
import { buildAdminContextMiddleware } from "./contextMiddleware.js";
import { resolvers } from "./resolvers/index.js";

export interface ServerConfig {
  port: number;
}

/**
 * Create and start GraphQL-only server
 * Uses admin context middleware that sets async local storage context
 * Kernel is obtained from singleton (must be initialized first)
 */
export async function startServer(serverConfig: ServerConfig) {
  let kernel: Kernel | null = null;

  if (Kernel.isInitialized()) {
    kernel = Kernel.getInstance();
  } else {
    console.warn("[IAM] Kernel not initialized");
  }

  const app = fastify({
    logger: isDevelopment(global)
      ? {
          level: global.log_level ?? "info",
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:HH:MM:ss.l",
              ignore: "pid,hostname,reqId,responseTime",
              messageFormat: "[IAM] {msg}",
              levelFirst: true,
            },
          },
        }
      : { level: global.log_level ?? "info" },
  });

  // Load GraphQL schema - use import.meta.url to get correct path when loaded from orchestrator
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const schemaFiles = [
    "shared-locale.graphql",
    "shared-currency.graphql",
    "shared-units.graphql",
    "base.graphql",
    "user.graphql",
    "role.graphql",
    "organization.graphql",
    "membership.graphql",
  ];

  const modules = schemaFiles.map((file) => ({
    typeDefs: gql(readFileSync(join(__dirname, "schema", file), "utf-8")),
    resolvers,
  }));

  // Create Apollo Server
  const apollo = new ApolloServer<ServiceContext>({
    introspection: true,
    schema: buildSubgraphSchema(modules),
    plugins: [fastifyApolloDrainPlugin(app)],
  });

  await apollo.start();

  // Admin context middleware - extracts user from session
  app.addHook(
    "preHandler",
    buildAdminContextMiddleware({
      repository: kernel?.repository ?? null,
    })
  );

  // GraphQL endpoint
  await app.register(fastifyApollo(apollo), {
    path: "/graphql",
    context: async (request, _reply): Promise<ServiceContext> => {
      const ctx: ServiceContext = {
        requestId: request.id as string,
        kernel: kernel!,
        currentUser: request.currentUser,
        // Create loaders per request for proper batching
        loaders: new Loader(kernel!.repository),
      };

      // Set context in AsyncLocalStorage for all resolvers
      setContext(ctx);

      return ctx;
    },
  });

  // Health check endpoints
  app.get("/", async (_request, reply) => {
    return reply.send({
      status: "ok",
      service: "iam",
      environment: global.environment,
    });
  });

  app.get("/healthz", async (_request, reply) => {
    return reply.send({
      status: "ok",
      service: "iam",
    });
  });

  // Start server
  await app.listen({
    port: serverConfig.port,
    host: "0.0.0.0",
  });

  app.log.info(
    `iam GraphQL Admin API ready at http://localhost:${serverConfig.port}/graphql`
  );

  return app;
}
