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
import { resolvers } from "@src/interfaces/gql-storefront-api/resolvers";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { buildCoreContextMiddleware } from "@src/interfaces/server/contextMiddleware";

const { service, global } = getServiceConfig("checkout");

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
              messageFormat: '[CHECKOUT] {msg}',
              levelFirst: true,
            },
          },
        }
      : { level: global.log_level ?? "info" },
  });

  // Load GraphQL schema
  // Use import.meta.url to get the current file's directory, works when run from orchestrator
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const schemaFiles = [
    // Shared types first (copied from packages/shared-references during build)
    "shared-currency.graphql",
    "shared-locale.graphql",
    "shared-units.graphql",
    // Service-specific schemas
    "parent.graphql",
    "base.graphql",
    "checkout.graphql",
    "checkoutLine.graphql",
    "checkoutDelivery.graphql",
    "checkoutPayment.graphql",
    "country.graphql",
  ];

  const modules = schemaFiles.map((file) => ({
    typeDefs: gql(readFileSync(join(currentDir, "schema", file), "utf-8")),
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
      environment: global.environment,
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
      getGrpcHost: () => global.platform_grpc_host,
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
          store: request.store,
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

  const port = service.ports?.storefront_graphql ?? 0;

  // Start server
  await app.listen({
    port,
    host: "0.0.0.0",
  });

  app.log.info(
    `checkout GraphQL API ready at http://localhost:${port}/graphql`
  );

  return app;
}
