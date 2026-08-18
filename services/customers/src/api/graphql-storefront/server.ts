import { ApolloServer } from "@apollo/server";
import { unwrapResolverError } from "@apollo/server/errors";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import { buildSubgraphSchema } from "@apollo/subgraph";
import fastifyApollo, {
  fastifyApolloDrainPlugin,
} from "@as-integrations/fastify";
import { InvalidCursorError } from "@shopana/drizzle-query";
import {
  getServiceConfig,
  isDevelopment,
} from "@shopana/shared-service-config";
import { ResolverError } from "@shopana/type-resolver";
import fastify from "fastify";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphQLError } from "graphql";
import { gql } from "graphql-tag";
import { setContext, ServiceContext } from "../../context/index.js";
import { Kernel } from "../../kernel/Kernel.js";
import { Loader } from "../../loaders/Loader.js";
import { buildStorefrontContextMiddleware } from "./contextMiddleware.js";
import { resolvers } from "./resolvers/index.js";

const { global } = getServiceConfig("customers");

export interface StorefrontServerConfig {
  port: number;
}

export async function startStorefrontServer(
  serverConfig: StorefrontServerConfig,
) {
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
              messageFormat: "[CUSTOMERS STOREFRONT] {msg}",
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
    "media.graphql",
    "address.graphql",
    "comparison.graphql",
    "customer.graphql",
    "lifecycle.graphql",
    "marketing.graphql",
    "tax.graphql",
    "wishlist.graphql",
    "base.graphql",
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
    formatError: (formattedError, error) => {
      const graphQLError = unwrapTypeResolverGraphQLError(error);
      if (graphQLError) {
        return {
          ...formattedError,
          message: graphQLError.message,
          extensions: withoutStacktrace({
            ...formattedError.extensions,
            ...graphQLError.extensions,
          }),
        };
      }
      const original = unwrapTypeResolverError(error);
      if (original instanceof InvalidCursorError) {
        return {
          message: original.message,
          locations: formattedError.locations,
          path: formattedError.path,
          extensions: { code: "BAD_USER_INPUT" },
        };
      }
      return {
        message: "Internal server error",
        locations: formattedError.locations,
        path: formattedError.path,
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      };
    },
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
        const context = new ServiceContext({
          requestId: request.id as string,
          kernel,
          store: request.store,
          storefrontAccess: request.storefrontAccess,
          customer: request.customer,
          locale: request.customer?.language ?? request.store.defaultLocale,
          currency: request.store.currencyCode,
          loaders: new Loader(kernel.repository, {
            customerId: request.customer?.id,
            storeId: request.store.id,
            broker: kernel.getServices().broker,
          }),
        });
        setContext(context);
        return context;
      },
    });
  });

  app.get("/", async (_request, reply) =>
    reply.send({
      status: "ok",
      service: "customers-storefront",
      environment: global.environment,
    }),
  );
  app.get("/healthz", async (_request, reply) =>
    reply.send({ status: "ok", service: "customers-storefront" }),
  );

  await app.listen({ port: serverConfig.port, host: "0.0.0.0" });
  return app;
}

function unwrapTypeResolverGraphQLError(error: unknown): GraphQLError | null {
  const current = unwrapTypeResolverError(error);
  return current instanceof GraphQLError ? current : null;
}

function unwrapTypeResolverError(error: unknown): unknown {
  let current = unwrapResolverError(error);
  while (current instanceof ResolverError) current = current.originalError;
  return current;
}

function withoutStacktrace(
  extensions: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const { stacktrace: _stacktrace, ...safeExtensions } = extensions;
  return safeExtensions;
}
