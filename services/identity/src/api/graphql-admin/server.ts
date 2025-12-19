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
import { Kernel } from "../../kernel/Kernel.js";
import type { CasdoorAdapter } from "../../adapters/casdoor/CasdoorAdapter.js";
import { buildAdminContextMiddleware } from "./contextMiddleware.js";
import { resolvers } from "./resolvers/index.js";

const { global } = getServiceConfig("identity");

export interface ServerConfig {
  port: number;
  casdoorAdapter: CasdoorAdapter | null;
}

const consoleLogger = {
  info: (...args: any[]) => console.log("[INFO]", ...args),
  warn: (...args: any[]) => console.warn("[WARN]", ...args),
  error: (...args: any[]) => console.error("[ERROR]", ...args),
  debug: (...args: any[]) => console.debug("[DEBUG]", ...args),
};

export async function startServer(serverConfig: ServerConfig) {
  const kernel = new Kernel(
    serverConfig.casdoorAdapter,
    consoleLogger,
    null
  );

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
              messageFormat: "[IDENTITY] {msg}",
              levelFirst: true,
            },
          },
        }
      : { level: global.log_level ?? "info" },
  });

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const schemaFiles = ["base.graphql", "user.graphql"];

  const modules = schemaFiles.map((file) => ({
    typeDefs: gql(readFileSync(join(__dirname, "schema", file), "utf-8")),
    resolvers,
  }));

  const apollo = new ApolloServer<ServiceContext>({
    introspection: true,
    schema: buildSubgraphSchema(modules),
    plugins: [fastifyApolloDrainPlugin(app)],
  });

  await apollo.start();

  app.addHook(
    "preHandler",
    buildAdminContextMiddleware({ casdoorAdapter: serverConfig.casdoorAdapter })
  );

  await app.register(fastifyApollo(apollo), {
    path: "/graphql",
    context: async (request, _reply): Promise<ServiceContext> => {
      const ctx: ServiceContext = {
        requestId: request.id as string,
        kernel: kernel!,
        currentUser: request.currentUser,
      };

      setContext(ctx);

      return ctx;
    },
  });

  app.get("/", async (_request, reply) => {
    return reply.send({
      status: "ok",
      service: "identity",
      environment: global.environment,
    });
  });

  app.get("/healthz", async (_request, reply) => {
    return reply.send({
      status: "ok",
      service: "identity",
    });
  });

  await app.listen({
    port: serverConfig.port,
    host: "0.0.0.0",
  });

  app.log.info(
    `identity GraphQL Admin API ready at http://localhost:${serverConfig.port}/graphql`
  );

  return app;
}
