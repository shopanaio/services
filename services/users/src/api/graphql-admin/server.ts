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
import { getServiceConfig, isDevelopment } from "@shopana/shared-service-config";
import {
  setContext,
  type ServiceContext,
} from "../../context/index.js";

const { global } = getServiceConfig("users");
import { Kernel } from "../../kernel/Kernel.js";
import { Repository, type RepositoryConfig } from "../../repositories/index.js";
import { buildAdminContextMiddleware } from "./contextMiddleware.js";
import { resolvers } from "./resolvers/index.js";

export interface ServerConfig {
  port: number;
  repository?: RepositoryConfig;
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
export async function startServer(serverConfig: ServerConfig) {
  console.log("[USERS] startServer called, repository config:", serverConfig.repository ? "present" : "missing");

  // Initialize Repository and Kernel
  let repository: Repository | null = null;
  let kernel: Kernel | null = null;

  if (serverConfig.repository) {
    repository = await Repository.create(serverConfig.repository);
    kernel = new Kernel(repository, consoleLogger, null);
    console.log("[USERS] Repository connected, Kernel initialized (certificate fetched from Casdoor)");
  } else {
    console.warn(
      "[USERS] No repository config provided, running without repository"
    );
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
              messageFormat: '[USERS] {msg}',
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

  // Admin context middleware
  app.addHook("preHandler", buildAdminContextMiddleware({}));

  // GraphQL endpoint
  await app.register(fastifyApollo(apollo), {
    path: "/graphql",
    context: async (request, _reply): Promise<ServiceContext> => {
      const ctx: ServiceContext = {
        requestId: request.id as string,
        kernel: kernel!,
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
      service: "users",
      environment: global.environment,
    });
  });

  app.get("/healthz", async (_request, reply) => {
    return reply.send({
      status: "ok",
      service: "users",
    });
  });

  // Start server
  await app.listen({
    port: serverConfig.port,
    host: "0.0.0.0",
  });

  app.log.info(
    `users GraphQL Admin API ready at http://localhost:${serverConfig.port}/graphql`
  );

  return app;
}
