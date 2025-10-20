import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import fastifyApollo, {
  fastifyApolloDrainPlugin,
} from "@as-integrations/fastify";
import fastify from "fastify";
import { readFileSync } from "fs";
import { join } from "path";
import { gql } from "graphql-tag";

import type { ServiceBroker } from "moleculer";
import { resolvers as adminResolvers } from "@src/interfaces/gql-admin-api/resolvers";
import { resolvers as storefrontResolvers } from "@src/interfaces/gql-storefront-api/resolvers";
import type { GraphQLContext } from "@src/interfaces/gql-admin-api/context";
import { config } from "@src/config";
import { buildCoreContextMiddleware } from "@src/interfaces/server/contextMiddleware";

/**
 * Create and start GraphQL-only server
 * Uses core context middleware that sets async local storage context
 */
export async function startServer(broker: ServiceBroker) {
  const isDevelopment = !!1 || process.env.NODE_ENV === "development";

  const app = fastify({
    logger: isDevelopment
      ? {
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:HH:MM:ss.l",
              ignore: "pid,hostname,reqId,responseTime",
              messageFormat: "[FASTIFY] {msg}",
              levelFirst: true,
            },
          },
        }
      : true,
  });

  // Load GraphQL schemas for both Admin and Storefront APIs
  const adminSchemaPath = [
    process.cwd(),
    "src",
    "interfaces",
    "gql-admin-api",
    "schema",
  ];
  const storefrontSchemaPath = [
    process.cwd(),
    "src",
    "interfaces",
    "gql-storefront-api",
    "schema",
  ];

  const schemaFiles = [
    "base.graphql",
    "country.graphql",
    "currency.graphql",
    "order.graphql",
    "parent.graphql",
  ];

  // Admin API schemas and modules
  const adminSchemas = schemaFiles.map((file) =>
    join(...adminSchemaPath, file)
  );
  const adminModules = adminSchemas.map((p) => ({
    typeDefs: gql(readFileSync(p, "utf-8")),
    resolvers: adminResolvers,
  }));

  // Storefront API schemas and modules
  const storefrontSchemas = schemaFiles.map((file) =>
    join(...storefrontSchemaPath, file)
  );
  const storefrontModules = storefrontSchemas.map((p) => ({
    typeDefs: gql(readFileSync(p, "utf-8")),
    resolvers: storefrontResolvers,
  }));

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
    return reply.send({ status: "ok", service: "order" });
  });

  // Healthz endpoint for Docker health checks
  app.get("/healthz", async (_request, reply) => {
    return reply.send({ status: "ok", service: "order" });
  });

  // Admin GraphQL route group with context middleware
  await app.register(async function (adminGraphqlInstance) {
    // Core context middleware that sets async local storage
    const grpcConfig = {
      getGrpcHost: () => config.platformGrpcHost,
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
      getGrpcHost: () => config.platformGrpcHost,
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

  // Start server
  await app.listen({
    port: config.port,
    host: "0.0.0.0",
  });

  app.log.info(
    `Order GraphQL API ready:\n` +
      `  Admin API: http://localhost:${config.port}/graphql/admin/v1\n` +
      `  Storefront API: http://localhost:${config.port}/graphql/storefront/v1`
  );

  return app;
}
