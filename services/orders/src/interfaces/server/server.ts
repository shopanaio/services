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
import { resolvers } from "@src/interfaces/gql-storefront-api/resolvers";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
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

  // Load GraphQL schema
  const schemaPath = [
    process.cwd(),
    "src",
    "interfaces",
    "gql-storefront-api",
    "schema",
  ];
  const storefrontSchemas = [
    join(...schemaPath, "parent.graphql"),
    join(...schemaPath, "base.graphql"),
    join(...schemaPath, "order.graphql"),
    join(...schemaPath, "orderLine.graphql"),
    join(...schemaPath, "orderDelivery.graphql"),
    join(...schemaPath, "currency.graphql"),
    join(...schemaPath, "country.graphql"),
    join(...schemaPath, "purchasable.graphql"),
  ];

  const modules = storefrontSchemas.map((p) => ({
    typeDefs: gql(readFileSync(p, "utf-8")),
    resolvers,
  }));

  // Create Apollo Server
  const apollo = new ApolloServer<GraphQLContext>({
    introspection: true,
    schema: buildSubgraphSchema(modules),
    plugins: [fastifyApolloDrainPlugin(app)],
  });

  await apollo.start();

  // Health check endpoint
  app.get("/", async (_request, reply) => {
    return reply.send({ status: "ok", service: "order" });
  });

  // GraphQL route group with context middleware
  await app.register(async function (graphqlInstance) {
    // Core context middleware that sets async local storage
    await graphqlInstance.addHook(
      "preHandler",
      buildCoreContextMiddleware(broker)
    );

    // GraphQL endpoint with simplified context
    await graphqlInstance.register(fastifyApollo(apollo), {
      path: "/graphql",
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
    `Order GraphQL API ready at http://localhost:${config.port}/graphql`
  );

  return app;
}
