import { ApolloServer, type ApolloServerPlugin } from "@apollo/server";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
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
import { setContext, ServiceContext } from "../../context/index.js";
import { Loader } from "../../loaders/Loader.js";

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

const timingPlugin: ApolloServerPlugin<ServiceContext> = {
  async requestDidStart({ request }) {
    const start = performance.now();
    return {
      async willSendResponse() {
        const ms = (performance.now() - start).toFixed(0);
        console.log(`[PROJECT] ${request.operationName ?? "query"}: ${ms}ms`);
      },
    };
  },
};

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
    disableRequestLogging: true,
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
    plugins: [
      fastifyApolloDrainPlugin(app),
      timingPlugin,
      ApolloServerPluginInlineTraceDisabled(),
    ],
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

  // GraphQL endpoint with scoped middleware
  await app.register(async (instance) => {
    // Admin context middleware with error handling
    // Scoped to this plugin only (not applied to health checks)
    instance.addHook("preHandler", buildAdminContextMiddleware());

    await instance.register(fastifyApollo(apollo), {
      path: "/graphql",
      context: async (request, _reply): Promise<ServiceContext> => {
        // For introspection, return minimal context
        const isIntrospection = request.headers["x-interpolation"] === "true";
        if (isIntrospection) {
          return new ServiceContext({
            requestId: request.id as string,
            kernel: kernel as Kernel,
            loaders: null as any,
          });
        }

        // Create fresh loaders per request for proper batching within request scope
        const loaders = new Loader(kernel!.getServices().broker);

        const ctx = new ServiceContext({
          requestId: request.id as string,
          kernel: kernel!,
          storeName: request.storeName,
          user: request.user,
          loaders,
        });

        // Set context in AsyncLocalStorage for all resolvers
        setContext(ctx);

        return ctx;
      },
    });
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
    `project GraphQL Admin API ready at http://localhost:${serverConfig.port}/graphql`,
  );

  return app;
}
