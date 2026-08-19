import { ApolloServer, type ApolloServerPlugin } from "@apollo/server";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import { buildSubgraphSchema } from "@apollo/subgraph";
import fastifyApollo, {
  fastifyApolloDrainPlugin,
} from "@as-integrations/fastify";
import { requireStorefrontPermission, STOREFRONT_PERMISSIONS } from "@shopana/shared-context";
import {
  getServiceConfig,
  isDevelopment,
} from "@shopana/shared-service-config";
import fastify from "fastify";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphQLError } from "graphql";
import { gql } from "graphql-tag";
import { ServiceContext, setContext } from "../../context/index.js";
import { buildQueryProtectionOptions } from "../../infrastructure/graphql/queryProtection.js";
import { Kernel } from "../../kernel/Kernel.js";
import { Loader } from "../../loaders/Loader.js";
import { buildStorefrontContextMiddleware } from "./contextMiddleware.js";
import { resolvers } from "./resolvers/index.js";

const { global } = getServiceConfig("loyalty");

export interface StorefrontServerConfig {
  port: number;
}

const userErrorsPlugin: ApolloServerPlugin<ServiceContext> = {
  async requestDidStart() {
    return {
      async willSendResponse({ contextValue, response }) {
        const errors = contextValue.getGraphqlErrors();
        if (errors.length === 0 || response.body.kind !== "single") return;

        response.body.singleResult.errors = [
          ...(response.body.singleResult.errors ?? []),
          ...errors.map((error) =>
            new GraphQLError(error.message, {
              extensions: {
                code: error.code ?? "BAD_USER_INPUT",
                field: error.field,
              },
            }).toJSON(),
          ),
        ];
      },
    };
  },
};

export async function startStorefrontServer(config: StorefrontServerConfig) {
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
              messageFormat: "[LOYALTY STOREFRONT] {msg}",
              levelFirst: true,
            },
          },
        }
      : { level: global.log_level ?? "info" },
  });

  const currentDir = dirname(fileURLToPath(import.meta.url));
  const packagedSchemaDir = join(currentDir, "schema", "storefront");
  const schemaDir = existsSync(packagedSchemaDir)
    ? packagedSchemaDir
    : join(currentDir, "schema");
  const schemaFiles = [
    "foundation.graphql",
    "shared-currency.graphql",
    "shared-locale.graphql",
    "shared-units.graphql",
    "loyalty.graphql",
    "presentation.graphql",
  ];
  const modules = schemaFiles.map((file) => ({
    typeDefs: gql(readFileSync(join(schemaDir, file), "utf8")),
    resolvers,
  }));

  const apollo = new ApolloServer<ServiceContext>({
    ...buildQueryProtectionOptions(global),
    schema: buildSubgraphSchema(modules),
    plugins: [
      fastifyApolloDrainPlugin(app),
      userErrorsPlugin,
      ApolloServerPluginInlineTraceDisabled(),
    ],
  });
  await apollo.start();

  await app.register(async (instance) => {
    instance.addHook("preHandler", buildStorefrontContextMiddleware());
    await instance.register(fastifyApollo(apollo), {
      path: "/graphql",
      context: async (request): Promise<ServiceContext> => {
        if (request.headers["x-interpolation"] === "true") {
          return new ServiceContext({
            requestId: request.id as string,
            kernel,
            loaders: null as never,
          });
        }
        if (!request.store) {
          throw new GraphQLError("Verified storefront context is required", {
            extensions: { code: "UNAUTHENTICATED" },
          });
        }

        requireStorefrontPermission(
          request.storefrontAccess,
          STOREFRONT_PERMISSIONS.LOYALTY_READ,
        );

        const effectiveAt = new Date().toISOString();
        const context = new ServiceContext({
          requestId: request.id as string,
          kernel,
          loaders: new Loader(kernel.repository, {
            broker: kernel.getServices().broker,
            storeId: request.store.id,
            currencyCode: request.store.currencyCode,
            localeCode: request.store.defaultLocale,
            effectiveAt,
          }),
          store: request.store,
          storefrontAccess: request.storefrontAccess,
          customer: request.customer,
          locale: request.store.defaultLocale,
          currency: request.store.currencyCode,
        });
        setContext(context);
        return context;
      },
    });
  });

  app.get("/", async (_request, reply) =>
    reply.send({
      status: "ok",
      service: "loyalty-storefront",
      environment: global.environment,
    }),
  );
  app.get("/healthz", async (_request, reply) =>
    reply.send({ status: "ok", service: "loyalty-storefront" }),
  );

  await app.listen({ port: config.port, host: "0.0.0.0" });
  return app;
}
