import { ApolloServer, type ApolloServerPlugin } from "@apollo/server";
import { unwrapResolverError } from "@apollo/server/errors";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import { buildSubgraphSchema } from "@apollo/subgraph";
import fastifyApollo, {
  fastifyApolloDrainPlugin,
} from "@as-integrations/fastify";
import fastify from "fastify";
import { readFileSync } from "fs";
import { GraphQLError } from "graphql";
import { gql } from "graphql-tag";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  getServiceConfig,
  isDevelopment,
} from "@shopana/shared-service-config";
import {
  ResolverError,
  TypeAuthorizationError,
} from "@shopana/type-resolver";
import { setContext, ServiceContext } from "../../context/index.js";
import { Kernel } from "../../kernel/Kernel.js";
import { Loader } from "../../loaders/Loader.js";
import { buildAdminContextMiddleware } from "./contextMiddleware.js";
import { resolvers } from "./resolvers/index.js";
import { storefrontCustomerContextHttpPlugin } from "../http/storefront-customer-context/index.js";

const { global } = getServiceConfig("customers");

export interface ServerConfig {
  port: number;
}

const userErrorsPlugin: ApolloServerPlugin<ServiceContext> = {
  async requestDidStart() {
    return {
      async willSendResponse({ contextValue, response }) {
        const errors = contextValue.getGraphqlErrors();
        if (errors.length === 0 || response.body.kind !== "single") {
          return;
        }

        response.body.singleResult.errors = [
          ...(response.body.singleResult.errors ?? []),
          ...errors.map((error) =>
            new GraphQLError(error.message, {
              extensions: {
                code: error.code ?? "BAD_USER_INPUT",
                field: error.field,
              },
            }).toJSON()
          ),
        ];
      },
    };
  },
};

function getHeaderValue(
  value: string | string[] | undefined
): string | undefined {
  const headerValue = Array.isArray(value) ? value[0] : value;
  const trimmed = headerValue?.trim();
  return trimmed ? trimmed : undefined;
}

export async function startServer(serverConfig: ServerConfig) {
  let kernel: Kernel | null = null;

  if (Kernel.isInitialized()) {
    kernel = Kernel.getInstance();
  } else {
    console.warn("[Customers] Kernel not initialized");
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
              messageFormat: "[Customers] {msg}",
              levelFirst: true,
            },
          },
        }
      : { level: global.log_level ?? "info" },
  });

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const schemaFiles = [
    "shared-currency.graphql",
    "shared-locale.graphql",
    "shared-units.graphql",
    "scalars.graphql",
    "base.graphql",
    "__generated__/base-filters.graphql",
    "__generated__/filters.graphql",
    "relay.graphql",
    "filters.graphql",
    "media.graphql",
    "customer.graphql",
    "comparison.graphql",
    "customerAccounts.graphql",
    "address.graphql",
    "tax.graphql",
    "consent.graphql",
    "classification.graphql",
    "statistics.graphql",
    "lifecycle.graphql",
  ];

  const modules = schemaFiles.map((file) => ({
    typeDefs: gql(readFileSync(join(__dirname, "schema", file), "utf-8")),
    resolvers,
  }));

  const apollo = new ApolloServer<ServiceContext>({
    introspection: true,
    // @ts-expect-error Class-based type-resolver root resolvers are Apollo-compatible at runtime.
    schema: buildSubgraphSchema(modules),
    plugins: [
      fastifyApolloDrainPlugin(app),
      userErrorsPlugin,
      ApolloServerPluginInlineTraceDisabled(),
    ],
    formatError: (formattedError, error) => {
      const graphQLError = unwrapTypeResolverGraphQLError(error);
      if (!graphQLError) {
        return formattedError;
      }

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
      context: async (request): Promise<ServiceContext> => {
        const isIntrospection = request.headers["x-interpolation"] === "true";
        if (isIntrospection) {
          return new ServiceContext({
            requestId: request.id as string,
            kernel: kernel as Kernel,
            loaders: null as unknown as Loader,
          });
        }

        const requestId =
          getHeaderValue(request.headers["x-idempotency-key"]) ??
          (request.id as string);
        const context = new ServiceContext({
          requestId,
          kernel: kernel!,
          store: request.store,
          user: request.user,
          adminContext: request.adminContext,
          loaders: new Loader(kernel!.repository),
        });

        setContext(context);
        return context;
      },
    });
  });

  await app.register(storefrontCustomerContextHttpPlugin, {
    kernel: kernel!,
    serviceToken: requiredEnvironment("STOREFRONT_RESOLVER_INTERNAL_TOKEN"),
  });

  app.get("/", async (_request, reply) =>
    reply.send({
      status: "ok",
      service: "customers",
      environment: global.environment,
    })
  );

  app.get("/healthz", async (_request, reply) =>
    reply.send({ status: "ok", service: "customers" })
  );

  await app.listen({ port: serverConfig.port, host: "0.0.0.0" });
  return app;
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function unwrapTypeResolverGraphQLError(error: unknown): GraphQLError | null {
  let current = unwrapResolverError(error);

  while (isResolverError(current)) {
    current = current.originalError;
  }

  if (isAuthorizationError(current)) {
    const extensions: Record<string, string> = { code: "FORBIDDEN" };
    if (typeof current.resource === "string") {
      extensions.resource = current.resource;
    }
    if (typeof current.action === "string") {
      extensions.action = current.action;
    }

    return new GraphQLError("Access denied", {
      extensions,
    });
  }

  return current instanceof GraphQLError ? current : null;
}

function isResolverError(
  error: unknown,
): error is ResolverError & { originalError: unknown } {
  return (
    error instanceof ResolverError ||
    (error instanceof Error && error.name === "ResolverError")
  ) && "originalError" in error;
}

function isAuthorizationError(
  error: unknown,
): error is Error & { resource?: unknown; action?: unknown } {
  return (
    error instanceof TypeAuthorizationError ||
    (error instanceof Error &&
      (error.name === "TypeAuthorizationError" ||
        error.name === "AuthorizationError"))
  );
}
