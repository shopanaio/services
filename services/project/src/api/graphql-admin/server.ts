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

const { global } = getServiceConfig("project");
import { Kernel } from "../../kernel/Kernel.js";
import {
  buildAdminContextMiddleware,
  ForbiddenError,
} from "./contextMiddleware.js";
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
    console.warn("[PROJECT] Kernel not initialized");
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
              messageFormat: "[PROJECT] {msg}",
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
    "project.graphql",
    "locale.graphql",
    "currency.graphql",
    "apiKey.graphql",
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
    formatError: (formattedError, error) => {
      // Handle ForbiddenError from context middleware
      const originalError =
        error instanceof Error ? error : (error as any)?.originalError;
      if (originalError instanceof ForbiddenError) {
        return {
          ...formattedError,
          message: originalError.message,
          extensions: {
            ...formattedError.extensions,
            code: "FORBIDDEN",
          },
        };
      }
      return formattedError;
    },
  });

  await apollo.start();

  // Admin context middleware with error handling
  app.addHook("preHandler", async (request, reply) => {
    try {
      await buildAdminContextMiddleware({})(request, reply);
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return reply.status(200).send({
          data: null,
          errors: [
            {
              message: error.message,
              extensions: { code: "FORBIDDEN" },
            },
          ],
        });
      }
      throw error;
    }
  });

  // GraphQL endpoint
  await app.register(fastifyApollo(apollo), {
    path: "/graphql",
    context: async (request, _reply): Promise<ServiceContext> => {
      // For introspection, return minimal context
      const isIntrospection =
        request.headers["x-interpolation"] === "true" ||
        request.headers["user-agent"]?.includes("rover");

      if (isIntrospection) {
        return {
          requestId: request.id as string,
          kernel: kernel as Kernel,
          slug: "",
          store: null as any,
          user: null as any,
        };
      }

      // Use store and user from middleware (set by contextMiddleware via GetCurrentStoreScript)
      const ctx: ServiceContext = {
        requestId: request.id as string,
        kernel: kernel!,
        store: request.store,
        user: request.user,
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
      service: "project",
      environment: global.environment,
    });
  });

  app.get("/healthz", async (_request, reply) => {
    return reply.send({
      status: "ok",
      service: "project",
    });
  });

  // Start server
  await app.listen({
    port: serverConfig.port,
    host: "0.0.0.0",
  });

  app.log.info(
    `project GraphQL Admin API ready at http://localhost:${serverConfig.port}/graphql`
  );

  return app;
}
