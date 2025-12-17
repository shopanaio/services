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
import { resolvers } from "@src/interfaces/gql-storefront-api/resolvers";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { config } from "@src/config";
import { buildCoreContextMiddleware } from "@src/interfaces/server/contextMiddleware";

/**
 * Create and start GraphQL-only server
 * Uses core context middleware that sets async local storage context
 */
export async function startServer(broker: ServiceBroker) {
  const app = fastify({
    logger: config.isDevelopment
      ? {
          level: config.logLevel ?? "info",
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:HH:MM:ss.l",
              ignore: "pid,hostname,reqId,responseTime",
              messageFormat: '[CHECKOUT] {msg}',
              levelFirst: true,
            },
          },
        }
      : { level: config.logLevel ?? "info" },
  });

  // Load GraphQL schema
  // Use import.meta.url to get the current file's directory, works when run from orchestrator
  const currentDir = dirname(fileURLToPath(import.meta.url));
  // In prod: currentDir = dist/, schemaPath = dist/schema (copied by esbuild)
  const schemaPath = join(currentDir, "schema");
  const storefrontSchemas = [
    join(schemaPath, "parent.graphql"),
    join(schemaPath, "base.graphql"),
    join(schemaPath, "checkout.graphql"),
    join(schemaPath, "checkoutLine.graphql"),
    join(schemaPath, "checkoutDelivery.graphql"),
    join(schemaPath, "checkoutPayment.graphql"),
    join(schemaPath, "currency.graphql"),
    join(schemaPath, "country.graphql"),
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
    return reply.send({
      status: "ok",
      service: "checkout",
      environment: config.environment,
    });
  });

  // Healthz endpoint for Docker health checks
  app.get("/healthz", async (_request, reply) => {
    return reply.send({
      status: "ok",
      service: "checkout",
    });
  });

  // GraphQL route group with context middleware
  await app.register(async function (graphqlInstance) {
    // Core context middleware that sets async local storage
    const grpcConfig = {
      getGrpcHost: () => config.platformGrpcHost,
    };
    await graphqlInstance.addHook(
      "preHandler",
      buildCoreContextMiddleware(grpcConfig)
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
          ip: request.ip,
          headers: {
            // expose only a safe subset for hashing
            "x-api-key": request.headers["x-api-key"] as string | undefined,
            authorization: request.headers["authorization"] as string | undefined,
            "accept-language": request.headers["accept-language"] as string | undefined,
            "user-agent": request.headers["user-agent"] as string | undefined,
          },
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
    `checkout GraphQL API ready at http://localhost:${config.port}/graphql`
  );

  return app;
}
