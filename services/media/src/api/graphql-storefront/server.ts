import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import { buildSubgraphSchema } from "@apollo/subgraph";
import fastifyApollo, {
  fastifyApolloDrainPlugin,
} from "@as-integrations/fastify";
import { requireStorefrontPermission } from "@shopana/shared-context";
import {
  getServiceConfig,
  isDevelopment,
} from "@shopana/shared-service-config";
import fastify from "fastify";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gql } from "graphql-tag";
import { setContext, ServiceContext } from "../../context/index.js";
import { Kernel } from "../../kernel/Kernel.js";
import { Loader } from "../../loaders/Loader.js";
import { buildStorefrontContextMiddleware } from "./contextMiddleware.js";
import { resolvers } from "./resolvers/index.js";

const { global } = getServiceConfig("media");

export interface StorefrontServerConfig {
  port: number;
}

export async function startStorefrontServer(
  serverConfig: StorefrontServerConfig,
) {
  let kernel: Kernel | null = null;

  if (Kernel.isInitialized()) {
    kernel = Kernel.getInstance();
  } else {
    console.warn("[Media Storefront] Kernel not initialized");
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
              messageFormat: "[MEDIA STOREFRONT] {msg}",
              levelFirst: true,
            },
          },
        }
      : { level: global.log_level ?? "info" },
  });

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const packagedSchemaDir = join(__dirname, "schema", "storefront");
  const schemaDir = existsSync(packagedSchemaDir)
    ? packagedSchemaDir
    : join(__dirname, "schema");
  const schemaFiles = [
    "foundation.graphql",
    "shared-currency.graphql",
    "shared-locale.graphql",
    "shared-units.graphql",
    "base.graphql",
    "file.graphql",
  ];
  const modules = schemaFiles.map((file) => ({
    typeDefs: gql(readFileSync(join(schemaDir, file), "utf8")),
    resolvers,
  }));

  const apollo = new ApolloServer<ServiceContext>({
    introspection: true,
    schema: buildSubgraphSchema(
      modules as unknown as Parameters<typeof buildSubgraphSchema>[0],
    ),
    plugins: [
      fastifyApolloDrainPlugin(app),
      ApolloServerPluginInlineTraceDisabled(),
    ],
  });
  await apollo.start();

  await app.register(async (instance) => {
    instance.addHook("preHandler", buildStorefrontContextMiddleware());

    await instance.register(fastifyApollo(apollo), {
      path: "/graphql",
      context: async (request, _reply): Promise<ServiceContext> => {
        const isIntrospection = request.headers["x-interpolation"] === "true";
        if (isIntrospection) {
          return new ServiceContext({
            requestId: request.id as string,
            kernel: kernel as Kernel,
            loaders: null as any,
          });
        }

        if (!request.store) {
          throw new Error("Verified storefront context is required");
        }

        requireStorefrontPermission(
          request.storefrontAccess,
          "storefront.catalog.read",
        );

        const ctx = new ServiceContext({
          requestId: request.id as string,
          kernel: kernel!,
          loaders: new Loader(kernel!.repository, {
            storeId: request.store.id,
          }),
          storefrontStore: request.store,
          storefrontAccess: request.storefrontAccess,
          storeName: request.store.name,
          locale: request.store.defaultLocale,
        });
        setContext(ctx);
        return ctx;
      },
    });
  });

  app.get("/", async (_request, reply) => {
    return reply.send({
      status: "ok",
      service: "media-storefront",
      environment: global.environment,
    });
  });

  app.get("/healthz", async (_request, reply) => {
    return reply.send({
      status: "ok",
      service: "media-storefront",
    });
  });

  await app.listen({
    port: serverConfig.port,
    host: "0.0.0.0",
  });

  return app;
}
