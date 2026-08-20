import { ApolloServer } from "@apollo/server";
import { unwrapResolverError } from "@apollo/server/errors";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import { buildSubgraphSchema } from "@apollo/subgraph";
import fastifyApollo, { fastifyApolloDrainPlugin } from "@as-integrations/fastify";
import fastify from "fastify";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphQLError } from "graphql";
import { gql } from "graphql-tag";
import { getServiceConfig, isDevelopment } from "@shopana/shared-service-config";
import { ResolverError } from "@shopana/type-resolver";
import { setContext, ServiceContext } from "../../context/index.js";
import { Kernel } from "../../kernel/Kernel.js";
import { Loader } from "../../loaders/Loader.js";
import { normalizeAdminError } from "../../scripts/shared/adminScriptSupport.js";
import { buildAdminContextMiddleware } from "./contextMiddleware.js";
import { resolvers } from "./resolvers/index.js";

const { global } = getServiceConfig("notifications");

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
              messageFormat: "[Notifications] {msg}",
            },
          },
        }
      : { level: global.log_level ?? "info" },
  });
  const directory = dirname(fileURLToPath(import.meta.url));
  const schema = gql(readFileSync(join(directory, "schema", "notifications.graphql"), "utf8"));
  const apollo = new ApolloServer<ServiceContext>({
    introspection: true,
    // @ts-expect-error
    schema: buildSubgraphSchema([{ typeDefs: schema, resolvers }]),
    plugins: [fastifyApolloDrainPlugin(app), ApolloServerPluginInlineTraceDisabled()],
    formatError: (formattedError, error) => {
      const graphQLError = normalizeAdminGraphQLError(error);
      return {
        ...formattedError,
        message: graphQLError.message,
        extensions: {
          ...formattedError.extensions,
          ...graphQLError.extensions,
        },
      };
    },
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
          loaders: new Loader(kernel.repository, kernel.renderer),
          store: request.store,
          user: request.user,
          adminContext: request.adminContext,
          locale: request.store?.defaultLocale,
        });
        setContext(context);
        return context;
      },
    });
  });
  app.get("/", async () => ({
    status: "ok",
    service: "notifications",
    environment: global.environment,
  }));
  app.get("/healthz", async () => ({
    status: "ok",
    service: "notifications",
  }));
  await app.listen({ port: config.port, host: "0.0.0.0" });
  return app;
}

function normalizeAdminGraphQLError(error: unknown): GraphQLError {
  let current = unwrapResolverError(error);
  while (current instanceof ResolverError) {
    current = current.originalError;
  }
  if (current instanceof GraphQLError) return current;

  const normalized = normalizeAdminError(current);
  return new GraphQLError(normalized.message, {
    extensions: {
      code: normalized.code,
      ...(normalized.details === undefined ? {} : { details: normalized.details }),
    },
  });
}

function readHeader(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}
