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
import { createResolvers } from "./resolvers";
import type { GraphQLContext } from "@src/kernel/types";
import type { Kernel } from "@src/kernel/Kernel";
import { config } from "@src/config";
import { buildCoreContextMiddleware } from "./contextMiddleware";

/**
 * Create and start GraphQL-only server
 * Resolvers use kernel for direct script execution
 */
export async function startServer(broker: ServiceBroker, kernel: Kernel) {
  const app = fastify({ logger: true });

  // Load GraphQL schema
  const schemaPath = [process.cwd(), "src", "api", "schema"];
  const sdlFiles = [
    join(...schemaPath, "base.graphql"),
    join(...schemaPath, "apps.graphql"),
  ];

  const resolvers = createResolvers(kernel);
  const modules = sdlFiles.map((p) => ({
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

  // GraphQL route group with simplified middleware
  await app.register(async function (graphqlInstance) {
    // Only core context middleware - no correlation middleware
    await graphqlInstance.addHook("preHandler", buildCoreContextMiddleware(broker));

    // GraphQL endpoint with simplified context
    await graphqlInstance.register(fastifyApollo(apollo), {
      path: config.graphqlPath,
      context: async (request, _reply) => {
        // Simplified context - only essential fields
        // Moleculer will handle internal tracing via ctx.requestID, ctx.parentID
        const ctx = {
          // Core business context from middleware
          project: request.project,
          customer: request.customer,
          // No correlation fields - Moleculer handles this internally
        } satisfies GraphQLContext;

        return ctx;
      },
    });
  });

  // Health check route
  app.get("/", async (_request, reply) => {
    return reply.send({
      status: "ok",
      service: "apps-service",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Start server
  await app.listen({
    port: config.port,
    host: "0.0.0.0",
  });

  app.log.info(
    `🚀 Apps Service ready at http://localhost:${config.port}${config.graphqlPath}`
  );
  app.log.info(
    `💚 Health check available at http://localhost:${config.port}/`
  );

  return app;
}
