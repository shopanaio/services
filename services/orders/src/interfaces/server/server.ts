import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import fastifyApollo, {
  fastifyApolloDrainPlugin,
} from "@as-integrations/fastify";
import fastify from "fastify";
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

/**
 * Create and start GraphQL-only server
 * Uses core context middleware that sets async local storage context
 */
export async function startServer(broker: ServiceBroker) {
  const app = fastify({
    logger: isDevelopment(global)
      ? {
          level: global.log_level ?? "info",
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:HH:MM:ss.l",
              ignore: "pid,hostname,reqId,responseTime",
              messageFormat: '[ORDERS] {msg}',
              levelFirst: true,
            },
          },
        }
      : { level: global.log_level ?? "info" },
  });

  // Load GraphQL schemas for both Admin and Storefront APIs
  // Use import.meta.url to get the current file's directory
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const schemaPath = join(currentDir, "schema");

  const schemaFiles = [
    "base.graphql",
    "country.graphql",
    "order.graphql",
    "parent.graphql",
  ];

  // Admin API schemas and modules
  const adminModules = [
    // Shared types first (copied from packages/shared-references during build)
    { typeDefs: gql(readFileSync(join(schemaPath, "shared-currency.graphql"), "utf-8")), resolvers: adminResolvers },
    { typeDefs: gql(readFileSync(join(schemaPath, "shared-locale.graphql"), "utf-8")), resolvers: adminResolvers },
    { typeDefs: gql(readFileSync(join(schemaPath, "shared-units.graphql"), "utf-8")), resolvers: adminResolvers },
    ...schemaFiles.map((file) => ({
      typeDefs: gql(readFileSync(join(schemaPath, "admin", file), "utf-8")),
      resolvers: adminResolvers,
    })),
  ];

  // Storefront API schemas and modules
  const storefrontModules = [
    // Shared types first (copied from packages/shared-references during build)
    { typeDefs: gql(readFileSync(join(schemaPath, "shared-currency.graphql"), "utf-8")), resolvers: storefrontResolvers },
    { typeDefs: gql(readFileSync(join(schemaPath, "shared-locale.graphql"), "utf-8")), resolvers: storefrontResolvers },
    { typeDefs: gql(readFileSync(join(schemaPath, "shared-units.graphql"), "utf-8")), resolvers: storefrontResolvers },
    ...schemaFiles.map((file) => ({
      typeDefs: gql(readFileSync(join(schemaPath, "storefront", file), "utf-8")),
      resolvers: storefrontResolvers,
    })),
  ];

  // Create Apollo Servers
  const adminApollo = new ApolloServer<GraphQLContext>({
    introspection: true,
    schema: buildSubgraphSchema(adminModules),
    plugins: [fastifyApolloDrainPlugin(app)],
  });

  const storefrontApollo = new ApolloServer<GraphQLContext>({
    introspection: true,
    schema: buildSubgraphSchema(storefrontModules),
    plugins: [fastifyApolloDrainPlugin(app)],
  });

  await adminApollo.start();
  await storefrontApollo.start();

  // Health check endpoint
  app.get("/", async (_request, reply) => {
    return reply.send({
      status: "ok",
      service: "orders",
      environment: global.environment,
    });
  });

  // Healthz endpoint for Docker health checks
  app.get("/healthz", async (_request, reply) => {
    return reply.send({
      status: "ok",
      service: "orders",
    });
  });

  // Admin GraphQL route group with context middleware
  await app.register(async function (adminGraphqlInstance) {
    // Core context middleware that sets async local storage
    const grpcConfig = {
      getGrpcHost: () => global.platform_grpc_host,
    };
    await adminGraphqlInstance.addHook(
      "preHandler",
      buildCoreContextMiddleware(grpcConfig)
    );

    // Admin GraphQL endpoint with simplified context
    await adminGraphqlInstance.register(fastifyApollo(adminApollo), {
      path: "/graphql/admin/v1",
      context: async (request, _reply) => {
        // Simplified context - only essential fields
        const ctx = {
          requestId: request.id as string,
          apiKey: (request.headers["x-api-key"] as string) ?? "unknown",
          project: request.project,
          user: null,
          customer: request.customer,
        } satisfies GraphQLContext;

        return ctx;
      },
    });
  });

  // Storefront GraphQL route group with context middleware
  await app.register(async function (storefrontGraphqlInstance) {
    // Core context middleware that sets async local storage
    const grpcConfig = {
      getGrpcHost: () => global.platform_grpc_host,
    };
    await storefrontGraphqlInstance.addHook(
      "preHandler",
      buildCoreContextMiddleware(grpcConfig)
    );

    // Storefront GraphQL endpoint with simplified context
    await storefrontGraphqlInstance.register(fastifyApollo(storefrontApollo), {
      path: "/graphql/storefront/v1",
      context: async (request, _reply) => {
        // Simplified context - only essential fields
        const ctx = {
          requestId: request.id as string,
          apiKey: (request.headers["x-api-key"] as string) ?? "unknown",
          project: request.project,
          user: null,
          customer: request.customer,
        } satisfies GraphQLContext;

        return ctx;
      },
    });
  });

  const port = service.ports?.storefront_graphql ?? 0;

  // Start server
  await app.listen({
    port,
    host: "0.0.0.0",
  });

  app.log.info(
    `orders GraphQL API ready:\n` +
      `  Admin API: http://localhost:${port}/graphql/admin/v1\n` +
      `  Storefront API: http://localhost:${port}/graphql/storefront/v1`
  );

  return app;
}
