import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import { buildSubgraphSchema } from "@apollo/subgraph";
import fastifyApollo, { fastifyApolloDrainPlugin } from "@as-integrations/fastify";
import fastify from "fastify";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gql } from "graphql-tag";
import { getServiceConfig, isDevelopment } from "@shopana/shared-service-config";
import { setContext, ServiceContext } from "../../context/index.js";
import { Kernel } from "../../kernel/Kernel.js";
import { buildAdminContextMiddleware } from "./contextMiddleware.js";
import { resolvers } from "./resolvers/index.js";

const { global } = getServiceConfig("audit");

export async function startServer(config: { port: number }) {
  const kernel = Kernel.getInstance();
  const app = fastify({
    disableRequestLogging: true,
    logger: isDevelopment(global)
      ? {
          level: global.log_level ?? "info",
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              messageFormat: "[Audit] {msg}",
            },
          },
        }
      : { level: global.log_level ?? "info" },
  });
  const directory = dirname(fileURLToPath(import.meta.url));
  const schema = gql(readFileSync(join(directory, "schema", "audit.graphql"), "utf8"));
  const apollo = new ApolloServer<ServiceContext>({
    introspection: true,
    // @ts-expect-error Apollo resolver typing does not model Type Resolver classes.
    schema: buildSubgraphSchema([{ typeDefs: schema, resolvers }]),
    plugins: [fastifyApolloDrainPlugin(app), ApolloServerPluginInlineTraceDisabled()],
  });

  await apollo.start();
  await app.register(async (instance) => {
    instance.addHook("preHandler", buildAdminContextMiddleware());
    await instance.register(fastifyApollo(apollo), {
      path: "/graphql",
      context: async (request) => {
        const context = new ServiceContext({
          requestId: readHeader(request.headers["x-idempotency-key"]) ?? String(request.id),
          kernel,
          store: request.store,
          user: request.user,
          adminContext: request.adminContext,
        });
        setContext(context);
        return context;
      },
    });
  });

  app.get("/", async () => ({
    status: "ok",
    service: "audit",
    environment: global.environment,
  }));
  app.get("/healthz", async () => ({ status: "ok", service: "audit" }));
  await app.listen({ port: config.port, host: "0.0.0.0" });
  return app;
}

function readHeader(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}
