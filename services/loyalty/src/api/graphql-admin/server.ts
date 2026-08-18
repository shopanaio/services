import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import { buildSubgraphSchema } from "@apollo/subgraph";
import fastifyApollo, {
  fastifyApolloDrainPlugin,
} from "@as-integrations/fastify";
import {
  getServiceConfig,
  isDevelopment,
} from "@shopana/shared-service-config";
import fastify from "fastify";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gql } from "graphql-tag";
import { ServiceContext, setContext } from "../../context/index.js";
import { Kernel } from "../../kernel/Kernel.js";
import { Loader } from "../../loaders/Loader.js";
import { buildAdminContextMiddleware } from "./contextMiddleware.js";
import { resolvers } from "./resolvers/index.js";

const { global } = getServiceConfig("loyalty");

export interface ServerConfig {
  port: number;
}

export async function startServer(config: ServerConfig) {
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
              messageFormat: "[Loyalty] {msg}",
              levelFirst: true,
            },
          },
        }
      : { level: global.log_level ?? "info" },
  });

  const schemaDir = join(dirname(fileURLToPath(import.meta.url)), "schema");
  const schemaFiles = [
    "shared-currency.graphql",
    "shared-locale.graphql",
    "shared-price-adjustment.graphql",
    "shared-units.graphql",
    "scalars.graphql",
    "base.graphql",
    "enums.graphql",
    "references.graphql",
    "relay.graphql",
    "program.graphql",
    "account.graphql",
    "ledger.graphql",
    "reservation.graphql",
    "event.graphql",
    "reward.graphql",
    "wallet.graphql",
    "maintenance.graphql",
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
    instance.addHook("preHandler", buildAdminContextMiddleware());
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

        const requestId =
          headerValue(request.headers["x-idempotency-key"]) ??
          (request.id as string);
        const context = new ServiceContext({
          requestId,
          kernel,
          loaders: new Loader(kernel.repository),
          store: request.store,
          user: request.user,
          adminContext: request.adminContext,
          currency: request.store.currencyCode,
          locale: request.store.defaultLocale,
        });
        setContext(context);
        return context;
      },
    });
  });

  app.get("/", async (_request, reply) =>
    reply.send({
      status: "ok",
      service: "loyalty",
      environment: global.environment,
    }),
  );
  app.get("/healthz", async (_request, reply) =>
    reply.send({ status: "ok", service: "loyalty" }),
  );

  await app.listen({ port: config.port, host: "0.0.0.0" });
  return app;
}

function headerValue(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = first?.trim();
  return trimmed || undefined;
}
