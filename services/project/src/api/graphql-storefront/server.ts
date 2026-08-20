import { ApolloServer, type ApolloServerPlugin } from "@apollo/server";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import { buildSubgraphSchema } from "@apollo/subgraph";
import fastifyApollo, { fastifyApolloDrainPlugin } from "@as-integrations/fastify";
import fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gql } from "graphql-tag";
import { buildStorefrontContextMiddleware } from "@shopana/shared-context";
import { getServiceConfig, isDevelopment } from "@shopana/shared-service-config";
import { setContext, ServiceContext } from "../../context/index.js";
import { Kernel } from "../../kernel/Kernel.js";
import { Loader } from "../../loaders/Loader.js";
import { resolvers } from "./resolvers/index.js";
import type { ContextStore, ContextStorefrontAccess } from "@shopana/shared-context";

declare module "fastify" {
  interface FastifyRequest {
    store?: ContextStore;
    storefrontAccess?: ContextStorefrontAccess;
  }
}

const { global } = getServiceConfig("project");

export interface StorefrontServerConfig {
  port: number;
}

const timingPlugin: ApolloServerPlugin<ServiceContext> = {
  async requestDidStart({ request }) {
    const start = performance.now();
    return {
      async willSendResponse() {
        const ms = (performance.now() - start).toFixed(0);
        console.log(`[PROJECT STOREFRONT] ${request.operationName ?? "query"}: ${ms}ms`);
      },
    };
  },
};

export async function startStorefrontServer(serverConfig: StorefrontServerConfig) {
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
              translateTime: "SYS:HH:MM:ss.l",
              ignore: "pid,hostname,reqId,responseTime",
              messageFormat: "[PROJECT STOREFRONT] {msg}",
              levelFirst: true,
            },
          },
        }
      : { level: global.log_level ?? "info" },
  });

  const currentDir = dirname(fileURLToPath(import.meta.url));
  const packagedSchemaDir = join(currentDir, "schema", "storefront");
  const schemaDir = existsSync(packagedSchemaDir) ? packagedSchemaDir : join(currentDir, "schema");
  const schemaFiles = [
    "foundation.graphql",
    "shared-currency.graphql",
    "shared-locale.graphql",
    "shared-units.graphql",
    "base.graphql",
    "references.graphql",
    "market/market.graphql",
    "store/brand.graphql",
    "store/contact.graphql",
    "store/store.graphql",
  ];
  const modules = schemaFiles.map((file) => ({
    typeDefs: gql(readFileSync(join(schemaDir, file), "utf8")),
    resolvers,
  }));

  const apollo = new ApolloServer<ServiceContext>({
    introspection: true,
    schema: buildSubgraphSchema(modules as unknown as Parameters<typeof buildSubgraphSchema>[0]),
    plugins: [fastifyApolloDrainPlugin(app), timingPlugin, ApolloServerPluginInlineTraceDisabled()],
  });
  await apollo.start();

  const contextMiddleware = buildStorefrontContextMiddleware(undefined, {
    serviceName: "PROJECT",
  });
  await app.register(async (instance) => {
    instance.addHook("preHandler", async (request: FastifyRequest, reply: FastifyReply) => {
      if (request.headers["x-interpolation"] === "true") return;
      await contextMiddleware(request, reply);
    });

    await instance.register(fastifyApollo(apollo), {
      path: "/graphql",
      context: async (request): Promise<ServiceContext> => {
        const ctx = new ServiceContext({
          requestId: request.id as string,
          kernel,
          loaders: new Loader(kernel.repository, undefined, request.store?.id),
          storefrontStore: request.store,
          storefrontAccess: request.storefrontAccess,
          storeName: request.store?.name,
          locale: request.store?.defaultLocale,
        });
        setContext(ctx);
        return ctx;
      },
    });
  });

  app.get("/", async (_request, reply) =>
    reply.send({
      status: "ok",
      service: "project-storefront",
      environment: global.environment,
    }),
  );
  app.get("/healthz", async (_request, reply) =>
    reply.send({ status: "ok", service: "project-storefront" }),
  );

  await app.listen({ port: serverConfig.port, host: "0.0.0.0" });
  return app;
}
