import { ApolloServer } from "@apollo/server";
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

const { global } = getServiceConfig("inventory");
import { Kernel } from "../../kernel/Kernel.js";
import { Loader } from "../../loaders/Loader.js";
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
    console.warn("[Inventory] Kernel not initialized");
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
              messageFormat: "[Inventory] {msg}",
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
    // Shared types first (copied from packages/shared-references during build)
    "shared-currency.graphql",
    "shared-locale.graphql",
    "shared-units.graphql",
    // Service-specific schemas
    "relay.graphql",
    "base.graphql",
    "physical.graphql",
    "pricing.graphql",
    "stock.graphql",
    "inventory-widget.graphql",
    "options.graphql",
    "features.graphql",
    "media.graphql",
    "seo.graphql",
    "variant.graphql",
    "product.graphql",
    // Generated schemas
    "__generated__/base-filters.graphql",
    "__generated__/filters.graphql",
  ];

  const modules = schemaFiles.map((file) => ({
    typeDefs: gql(readFileSync(join(__dirname, "schema", file), "utf-8")),
    resolvers,
  }));

  // Create Apollo Server
  const apollo = new ApolloServer<ServiceContext>({
    introspection: true,
    // @ts-expect-error
    schema: buildSubgraphSchema(modules),
    plugins: [
      fastifyApolloDrainPlugin(app),
      ApolloServerPluginInlineTraceDisabled(),
    ],
  });

  await apollo.start();

  // GraphQL endpoint with scoped context middleware
  await app.register(async (instance) => {
    // Admin context middleware - extracts store and user from headers
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

        // Create loaders per request for proper batching
        const loaders = new Loader(kernel!.repository);

        const ctx = new ServiceContext({
          requestId: request.id as string,
          kernel: kernel!,
          store: request.store,
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
      service: "inventory",
      environment: global.environment,
    });
  });

  app.get("/healthz", async (_request, reply) => {
    return reply.send({
      status: "ok",
      service: "inventory",
    });
  });

  // Start server
  await app.listen({
    port: serverConfig.port,
    host: "0.0.0.0",
  });

  app.log.info(
    `inventory GraphQL Admin API ready at http://localhost:${serverConfig.port}/graphql`,
  );

  return app;
}
