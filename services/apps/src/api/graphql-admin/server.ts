import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import { buildSubgraphSchema } from "@apollo/subgraph";
import fastifyApollo, {
  fastifyApolloDrainPlugin,
} from "@as-integrations/fastify";
import fastify from "fastify";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gql } from "graphql-tag";
import type { ServiceBroker } from "@shopana/shared-kernel";
import {
  getServiceConfig,
  isDevelopment,
} from "@shopana/shared-service-config";
import {
  ServiceContext,
  setContext,
} from "../../context/index.js";
import type { AppInstallationStore } from "../../control-plane/AppInstallationStore.js";
import type { AppLifecycleService } from "../../control-plane/AppLifecycleService.js";
import type { Repository } from "../../repositories/Repository.js";
import type { AppRuntimeRegistry } from "../../runtime/AppRuntimeRegistry.js";
import { Loader } from "../../loaders/Loader.js";
import { buildAdminContextMiddleware } from "./contextMiddleware.js";
import { resolvers } from "./resolvers/index.js";

const { global } = getServiceConfig("apps");

export interface ServerConfig {
  port: number;
  broker: ServiceBroker;
  repository: Repository;
  installations: AppInstallationStore;
  lifecycle: AppLifecycleService;
  runtimes: AppRuntimeRegistry;
}

function getHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  const headerValue = Array.isArray(value) ? value[0] : value;
  const trimmed = headerValue?.trim();
  return trimmed || undefined;
}

/**
 * Create and start the Apps admin control-plane GraphQL server.
 */
export async function startServer(serverConfig: ServerConfig) {
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
              messageFormat: "[Apps] {msg}",
              levelFirst: true,
            },
          },
        }
      : { level: global.log_level ?? "info" },
  });

  const filename = fileURLToPath(import.meta.url);
  const directory = dirname(filename);
  const schemaFiles = [
    "scalars.graphql",
    "base.graphql",
    "relay.graphql",
    "app-definition.graphql",
    "app-installation.graphql",
    "app-lifecycle.graphql",
  ];
  const modules = schemaFiles.map((file) => ({
    typeDefs: gql(
      readFileSync(join(directory, "schema", file), "utf-8"),
    ),
    resolvers,
  }));

  const apollo = new ApolloServer<ServiceContext>({
    introspection: true,
    // @ts-expect-error Class-based type-resolver roots are Apollo-compatible at runtime.
    schema: buildSubgraphSchema(modules),
    plugins: [
      fastifyApolloDrainPlugin(app),
      ApolloServerPluginInlineTraceDisabled(),
    ],
  });

  await apollo.start();

  await app.register(async (instance) => {
    instance.addHook(
      "preHandler",
      buildAdminContextMiddleware(serverConfig.broker),
    );

    await instance.register(fastifyApollo(apollo), {
      path: "/graphql",
      context: async (request): Promise<ServiceContext> => {
        const requestId =
          getHeaderValue(request.headers["x-idempotency-key"]) ??
          (request.id as string);
        const context = new ServiceContext({
          requestId,
          broker: serverConfig.broker,
          repository: serverConfig.repository,
          installations: serverConfig.installations,
          lifecycle: serverConfig.lifecycle,
          runtimes: serverConfig.runtimes,
          loaders: new Loader(serverConfig.repository),
          store: request.store,
          user: request.user,
        });

        setContext(context);
        return context;
      },
    });
  });

  app.get("/", async (_request, reply) =>
    reply.send({
      status: "ok",
      service: "apps",
      environment: global.environment,
    }),
  );

  app.get("/healthz", async (_request, reply) =>
    reply.send({ status: "ok", service: "apps" }),
  );

  await app.listen({
    port: serverConfig.port,
    host: "0.0.0.0",
  });

  return app;
}
