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
import type { InventoryContext } from "../../context/index.js";
import { runMigrations } from "../../infrastructure/db/migrate.js";
import { Kernel } from "../../kernel/Kernel.js";
import { Repository } from "../../repositories/Repository.js";
import { buildAdminContextMiddleware } from "./contextMiddleware.js";
import { inventoryContextPlugin } from "./inventoryContextPlugin.js";
import { resolvers } from "./resolvers/index.js";

export interface GraphQLContext {
  requestId: string;
  kernel: Kernel;
  /** Internal context for plugin - use getContext() in resolvers */
  _inventoryContext: InventoryContext | null;
}

export interface ServerConfig {
  port: number;
  grpcHost?: string;
  databaseUrl?: string;
  migrationsPath?: string;
}

// Simple console logger for Kernel
const consoleLogger = {
  info: (...args: any[]) => console.log("[INFO]", ...args),
  warn: (...args: any[]) => console.warn("[WARN]", ...args),
  error: (...args: any[]) => console.error("[ERROR]", ...args),
  debug: (...args: any[]) => console.debug("[DEBUG]", ...args),
};

/**
 * Create and start GraphQL-only server
 * Uses admin context middleware that sets async local storage context
 */
export async function startServer(config: ServerConfig) {
  const isDevelopment = process.env.NODE_ENV === "development";

  // Initialize Repository and Kernel
  const databaseUrl = config.databaseUrl || process.env.DATABASE_URL || "";
  let repository: Repository | null = null;
  let kernel: Kernel | null = null;

  if (databaseUrl) {
    // Run migrations before initializing the database
    if (config.migrationsPath) {
      console.log("[INVENTORY] Running database migrations...");
      await runMigrations(databaseUrl, config.migrationsPath);
      console.log("[INVENTORY] Database migrations completed");
    }

    repository = new Repository(databaseUrl);
    kernel = new Kernel(repository, consoleLogger, null);
    console.log("[INVENTORY] Database connected, Kernel initialized");
  } else {
    console.warn(
      "[INVENTORY] No DATABASE_URL configured, running without database"
    );
  }

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
    "variant.graphql",
    "product.graphql",
  ];

  const modules = schemaFiles.map((file) => ({
    typeDefs: gql(readFileSync(join(__dirname, "schema", file), "utf-8")),
    resolvers,
  }));

  // Create Apollo Server
  const apollo = new ApolloServer<GraphQLContext>({
    introspection: true,
    schema: buildSubgraphSchema(modules),
    plugins: [fastifyApolloDrainPlugin(app), inventoryContextPlugin()],
  });

  await apollo.start();

  // Admin context middleware
  const grpcConfig = {
    getGrpcHost: () =>
      config.grpcHost ?? process.env.PLATFORM_GRPC_HOST ?? "localhost:50051",
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
          kernel: kernel as Kernel,
          _inventoryContext: null,
        };
      }

      return {
        requestId: request.id as string,
        kernel: kernel as Kernel,
        _inventoryContext: {
          slug: request.headers["x-pj-key"] as string,
          project: request.project,
          user: request.user,
        },
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
