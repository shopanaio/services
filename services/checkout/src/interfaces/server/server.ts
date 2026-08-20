import { ApolloServer, type ApolloServerPlugin } from "@apollo/server";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import { buildSubgraphSchema } from "@apollo/subgraph";
import fastifyApollo, { fastifyApolloDrainPlugin } from "@as-integrations/fastify";
import fastify from "fastify";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getOperationAST, Kind, parse, type DocumentNode, type SelectionSetNode } from "graphql";
import { gql } from "graphql-tag";

import type { ServiceBroker } from "@shopana/shared-kernel";
import { getServiceConfig, isDevelopment } from "@shopana/shared-service-config";
import { resolvers } from "@src/interfaces/gql-storefront-api/resolvers";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { buildCoreContextMiddleware } from "@src/interfaces/server/contextMiddleware";
import { checkoutReadiness } from "./readiness.js";
import { mutationLatency } from "@src/infrastructure/observability/checkoutObservability.js";

const { service, global } = getServiceConfig("checkout");

/**
 * Create and start GraphQL-only server
 * Uses core context middleware that sets async local storage context
 */
export async function startServer(broker: ServiceBroker) {
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
              messageFormat: "[CHECKOUT] {msg}",
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
    "foundation.graphql",
    // Shared types first (copied from packages/shared-references during build)
    "shared-currency.graphql",
    "shared-locale.graphql",
    "shared-units.graphql",
    // Service-specific schemas
    "parent.graphql",
    "checkout.graphql",
    "checkoutLine.graphql",
    "checkoutDelivery.graphql",
    "checkoutPayment.graphql",
  ];

  const modules = schemaFiles.map((file) => ({
    typeDefs: gql(readFileSync(join(currentDir, "schema", file), "utf-8")),
    resolvers,
  }));
  const schema = buildSubgraphSchema(modules);
  const mutationMetricOperations = new Set(
    Object.keys(schema.getMutationType()?.getFields() ?? {}),
  );

  // Create Apollo Server
  const apollo = new ApolloServer<GraphQLContext>({
    introspection: true,
    schema,
    plugins: [
      fastifyApolloDrainPlugin(app),
      ApolloServerPluginInlineTraceDisabled(),
      mutationMetricsPlugin(mutationMetricOperations),
    ],
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

  // Liveness endpoint for Docker health checks. Keep dependency checks on /readyz.
  app.get("/healthz", async (_request, reply) => {
    return reply.send({ status: "ok", service: "checkout" });
  });

  app.get("/readyz", async (_request, reply) => {
    const readiness = await checkoutReadiness(broker);
    return reply.status(readiness.ready ? 200 : 503).send(readiness);
  });

  // GraphQL route group with context middleware
  await app.register(async function (graphqlInstance) {
    // Core context middleware that sets async local storage
    const grpcConfig = {
      getGrpcHost: () => global.platform_grpc_host as string,
    };
    await graphqlInstance.addHook("preHandler", buildCoreContextMiddleware(grpcConfig));
    // GraphQL endpoint with simplified context
    await graphqlInstance.register(fastifyApollo(apollo), {
      path: "/graphql",
      context: async (request, _reply) => {
        // Simplified context - only essential fields
        const ctx = {
          requestId: request.id as string,
          organizationId: request.organizationId,
          visitorId: request.storefrontVisitorId,
          store: request.store,
          user: null,
          customer: request.customer,
          storefrontAccess: request.storefrontAccess,
          ip: request.ip,
          headers: {
            // expose only a safe subset for hashing
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

  app.log.info(`checkout GraphQL API ready at http://localhost:${port}/graphql`);

  return app;
}

function mutationMetricsPlugin(
  knownOperations: ReadonlySet<string>,
): ApolloServerPlugin<GraphQLContext> {
  return {
    async requestDidStart({ request }) {
      const operation = mutationMetricOperation(
        { query: request.query, operationName: request.operationName },
        knownOperations,
      );
      if (!operation) return {};

      const startedAt = performance.now();
      let encounteredErrors = false;
      return {
        async didEncounterErrors() {
          encounteredErrors = true;
        },
        async willSendResponse({ response }) {
          const responseHasErrors = hasGraphqlApplicationErrors(response);
          mutationLatency.observe(
            {
              operation,
              outcome: encounteredErrors || responseHasErrors ? "error" : "ok",
            },
            (performance.now() - startedAt) / 1_000,
          );
        },
      };
    },
  };
}

function hasGraphqlApplicationErrors(response: {
  body: {
    kind: string;
    singleResult?: {
      errors?: readonly unknown[];
      data?: Record<string, unknown> | null;
    };
  };
}): boolean {
  if (response.body.kind !== "single" || !response.body.singleResult) return false;
  if (response.body.singleResult.errors?.length) return true;
  return Object.values(response.body.singleResult.data ?? {}).some((payload) =>
    Boolean(
      payload &&
      typeof payload === "object" &&
      "userErrors" in payload &&
      Array.isArray(payload.userErrors) &&
      payload.userErrors.length > 0,
    ),
  );
}

function mutationMetricOperation(
  body: { query?: unknown; operationName?: unknown } | undefined,
  knownOperations: ReadonlySet<string>,
): string | null {
  if (typeof body?.query !== "string") return null;
  try {
    const document = parse(body.query);
    const operation = getOperationAST(
      document,
      typeof body.operationName === "string" ? body.operationName : undefined,
    );
    if (operation?.operation !== "mutation") return null;

    const fields = new Set<string>();
    collectRootFields(document, operation.selectionSet, fields, new Set());
    if (fields.size === 1) {
      const field = fields.values().next().value;
      return field && knownOperations.has(field) ? field : "unknown";
    }
    return fields.size > 1 ? "multiple" : "unknown";
  } catch {
    return null;
  }
}

function collectRootFields(
  document: DocumentNode,
  selectionSet: SelectionSetNode,
  fields: Set<string>,
  visitedFragments: Set<string>,
): void {
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      fields.add(selection.name.value);
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      collectRootFields(document, selection.selectionSet, fields, visitedFragments);
    } else if (!visitedFragments.has(selection.name.value)) {
      visitedFragments.add(selection.name.value);
      const fragment = document.definitions.find(
        (definition) =>
          definition.kind === Kind.FRAGMENT_DEFINITION &&
          definition.name.value === selection.name.value,
      );
      if (fragment?.kind === Kind.FRAGMENT_DEFINITION) {
        collectRootFields(document, fragment.selectionSet, fields, visitedFragments);
      }
    }
  }
}
