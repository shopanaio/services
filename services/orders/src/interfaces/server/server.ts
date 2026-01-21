import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import { buildSubgraphSchema } from "@apollo/subgraph";
import fastifyApollo, {
  fastifyApolloDrainPlugin,
} from "@as-integrations/fastify";
import fastify, { type FastifyInstance } from "fastify";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { gql } from "graphql-tag";

import type { ServiceBroker } from "@shopana/shared-kernel";
import { getServiceConfig, isDevelopment } from "@shopana/shared-service-config";
import { resolvers as adminResolvers } from "@src/interfaces/gql-admin-api/resolvers";
import { resolvers as storefrontResolvers } from "@src/interfaces/gql-storefront-api/resolvers";
import type { GraphQLContext } from "@src/interfaces/gql-admin-api/context";
import { buildCoreContextMiddleware } from "@src/interfaces/server/contextMiddleware";

const { service, global } = getServiceConfig("orders");

function createFastifyApp(name: string): FastifyInstance {
  return fastify({
    logger: isDevelopment(global)
      ? {
          level: global.log_level ?? "info",
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:HH:MM:ss.l",
              ignore: "pid,hostname,reqId,responseTime",
              messageFormat: `[ORDERS-${name.toUpperCase()}] {msg}`,
              levelFirst: true,
            },
          },
        }
      : { level: global.log_level ?? "info" },
  });
}

function addHealthChecks(app: FastifyInstance, serviceName: string) {
  app.get("/", async (_request, reply) => {
    return reply.send({
      status: "ok",
      service: serviceName,
      environment: global.environment,
    });
  });

  app.get("/healthz", async (_request, reply) => {
    return reply.send({
      status: "ok",
      service: serviceName,
    });
  });
}

/**
 * Create and start GraphQL servers for orders service
 * Admin API on admin_graphql port, Storefront API on storefront_graphql port
 */
export async function startServer(broker: ServiceBroker) {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const schemaPath = join(currentDir, "schema");

  const schemaFiles = [
    "base.graphql",
    "country.graphql",
    "order.graphql",
    "parent.graphql",
  ];

  const grpcConfig = {
    getGrpcHost: () => global.platform_grpc_host,
  };

  // ═══════════════════════════════════════════════════════════════════
  // ADMIN SERVER
  // ═══════════════════════════════════════════════════════════════════
  const adminApp = createFastifyApp("admin");

  const adminModules = [
    { typeDefs: gql(readFileSync(join(schemaPath, "shared-currency.graphql"), "utf-8")), resolvers: adminResolvers },
    { typeDefs: gql(readFileSync(join(schemaPath, "shared-locale.graphql"), "utf-8")), resolvers: adminResolvers },
    { typeDefs: gql(readFileSync(join(schemaPath, "shared-units.graphql"), "utf-8")), resolvers: adminResolvers },
    ...schemaFiles.map((file) => ({
      typeDefs: gql(readFileSync(join(schemaPath, "admin", file), "utf-8")),
      resolvers: adminResolvers,
    })),
  ];

  const adminApollo = new ApolloServer<GraphQLContext>({
    introspection: true,
    schema: buildSubgraphSchema(adminModules),
    plugins: [fastifyApolloDrainPlugin(adminApp), ApolloServerPluginInlineTraceDisabled()],
  });

  await adminApollo.start();
  addHealthChecks(adminApp, "orders-admin");

  await adminApp.register(async function (graphqlInstance) {
    await graphqlInstance.addHook("preHandler", buildCoreContextMiddleware(grpcConfig));

    await graphqlInstance.register(fastifyApollo(adminApollo), {
      path: "/graphql",
      context: async (request, _reply) => {
        const ctx = {
          requestId: request.id as string,
          apiKey: (request.headers["x-api-key"] as string) ?? "unknown",
          store: request.store,
          user: null,
          customer: request.customer,
        } satisfies GraphQLContext;
        return ctx;
      },
    });
  });

  const adminPort = service.ports?.admin_graphql ?? 10004;
  await adminApp.listen({ port: adminPort, host: "0.0.0.0" });
  adminApp.log.info(`Orders Admin API ready at http://localhost:${adminPort}/graphql`);

  // ═══════════════════════════════════════════════════════════════════
  // STOREFRONT SERVER
  // ═══════════════════════════════════════════════════════════════════
  const storefrontApp = createFastifyApp("storefront");

  const storefrontModules = [
    { typeDefs: gql(readFileSync(join(schemaPath, "shared-currency.graphql"), "utf-8")), resolvers: storefrontResolvers },
    { typeDefs: gql(readFileSync(join(schemaPath, "shared-locale.graphql"), "utf-8")), resolvers: storefrontResolvers },
    { typeDefs: gql(readFileSync(join(schemaPath, "shared-units.graphql"), "utf-8")), resolvers: storefrontResolvers },
    ...schemaFiles.map((file) => ({
      typeDefs: gql(readFileSync(join(schemaPath, "storefront", file), "utf-8")),
      resolvers: storefrontResolvers,
    })),
  ];

  const storefrontApollo = new ApolloServer<GraphQLContext>({
    introspection: true,
    schema: buildSubgraphSchema(storefrontModules),
    plugins: [fastifyApolloDrainPlugin(storefrontApp), ApolloServerPluginInlineTraceDisabled()],
  });

  await storefrontApollo.start();
  addHealthChecks(storefrontApp, "orders-storefront");

  await storefrontApp.register(async function (graphqlInstance) {
    await graphqlInstance.addHook("preHandler", buildCoreContextMiddleware(grpcConfig));

    await graphqlInstance.register(fastifyApollo(storefrontApollo), {
      path: "/graphql",
      context: async (request, _reply) => {
        const ctx = {
          requestId: request.id as string,
          apiKey: (request.headers["x-api-key"] as string) ?? "unknown",
          store: request.store,
          user: null,
          customer: request.customer,
        } satisfies GraphQLContext;
        return ctx;
      },
    });
  });

  const storefrontPort = service.ports?.storefront_graphql ?? 10003;
  await storefrontApp.listen({ port: storefrontPort, host: "0.0.0.0" });
  storefrontApp.log.info(`Orders Storefront API ready at http://localhost:${storefrontPort}/graphql`);

  return { adminApp, storefrontApp };
}
