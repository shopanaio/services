import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
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
import { createResolvers } from "./resolvers";
import type { GraphQLContext } from "@src/kernel/types";
import type { Kernel } from "@src/kernel/Kernel";
import { buildCoreContextMiddleware } from "./contextMiddleware";

const { service, global } = getServiceConfig("apps");

/**
 * Create and start GraphQL-only server
 * Resolvers use kernel for direct script execution
 */
export async function startServer(broker: ServiceBroker, kernel: Kernel) {
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
              messageFormat: '[APPS] {msg}',
              levelFirst: true,
            },
          },
        }
      : { level: global.log_level ?? "info" },
  });

  // Load GraphQL schema - use import.meta.url to get correct path when loaded from orchestrator
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const schemaPath = join(__dirname, "schema");
  const sdlFiles = [
    // Shared types first (copied from packages/shared-references during build)
    join(schemaPath, "shared-currency.graphql"),
    join(schemaPath, "shared-locale.graphql"),
    join(schemaPath, "shared-units.graphql"),
    // Service-specific schemas
    join(schemaPath, "base.graphql"),
    join(schemaPath, "apps.graphql"),
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
    plugins: [fastifyApolloDrainPlugin(app), ApolloServerPluginInlineTraceDisabled()],
  });

  await apollo.start();

  const graphqlPath = service.graphql?.path ?? "/graphql";
  const port = service.ports?.admin_graphql ?? 0;

  // GraphQL route group with simplified middleware
  await app.register(async function (graphqlInstance) {
    // Only core context middleware - no correlation middleware
    const grpcConfig = {
      getGrpcHost: () => global.platform_grpc_host,
    };
    await graphqlInstance.addHook("preHandler", buildCoreContextMiddleware(grpcConfig));

    // GraphQL endpoint with simplified context
    await graphqlInstance.register(fastifyApollo(apollo), {
      path: graphqlPath,
      context: async (request, _reply) => {
        // Simplified context - only essential fields
        // Moleculer will handle internal tracing via ctx.requestID, ctx.parentID
        const ctx = {
          // Core business context from middleware
          store: request.store,
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
      service: "apps",
      environment: global.environment,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Healthz endpoint for Docker health checks
  app.get("/healthz", async (_request, reply) => {
    return reply.send({
      status: "ok",
      service: "apps",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Start server
  await app.listen({
    port,
    host: "0.0.0.0",
  });

  app.log.info(
    `apps ready at http://localhost:${port}${graphqlPath}`
  );
  app.log.info(
    `Health check available at http://localhost:${port}/`
  );

  return app;
}
