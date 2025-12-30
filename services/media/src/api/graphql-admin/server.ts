import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import fastifyApollo, {
  fastifyApolloDrainPlugin,
} from "@as-integrations/fastify";
import fastify from "fastify";
import { readFileSync } from "fs";
import { gql } from "graphql-tag";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getServiceConfig, buildS3Config, isDevelopment } from "@shopana/shared-service-config";
import { setContext, ServiceContext } from "../../context/index.js";
import { getBucketName } from "../../infrastructure/s3/index.js";
import { buildAdminContextMiddleware } from "./contextMiddleware.js";

const { service, global } = getServiceConfig("media");
const storageConfig = service.s3 ? buildS3Config(service.s3) : null;
import { resolvers } from "./resolvers/index.js";
import { Kernel } from "../../kernel/Kernel.js";
import { Loader } from "../../loaders/Loader.js";
import { processRequest } from "graphql-upload-minimal";

// Re-export for backward compatibility
export type { ServiceContext as GraphQLContext } from "../../context/index.js";

export interface ServerConfig {
  port: number;
}

/**
 * Create and start GraphQL-only server
 * Uses admin context middleware that sets async local storage context
 * Kernel is obtained from singleton (must be initialized first)
 */
export async function startServer(serverConfig: ServerConfig) {
  let kernel: Kernel | null = null;

  if (Kernel.isInitialized()) {
    kernel = Kernel.getInstance();
  } else {
    console.warn("[Media] Kernel not initialized");
  }

  // Ensure bucket record exists in database (for default/system bucket)
  if (kernel) {
    const bucketName = getBucketName();
    console.log(`[Media] Checking bucket record '${bucketName}' in database...`);
    try {
      const existingBucket = await kernel.repository.bucket.findByBucketName(bucketName);
      if (!existingBucket) {
        // Create a system-level bucket record
        // Using a fixed UUID for the system project
        const SYSTEM_PROJECT_ID = "00000000-0000-0000-0000-000000000000";
        await kernel.repository.bucket.create(SYSTEM_PROJECT_ID, {
          bucketName,
          region: storageConfig?.region ?? "us-east-1",
          status: "active",
          endpointUrl: storageConfig?.endpoint ?? "",
        });
        console.log(`[Media] Bucket record '${bucketName}' created in database`);
      } else {
        console.log(`[Media] Bucket record '${bucketName}' already exists in database`);
      }
    } catch (error) {
      console.error(`[Media] Failed to ensure bucket record exists:`, error);
    }
  }

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
              messageFormat: '[Media] {msg}',
              levelFirst: true,
            },
          },
        }
      : { level: global.log_level ?? "info" },
  });

  // Register custom content type parser for multipart/form-data (for GraphQL file uploads)
  app.addContentTypeParser("multipart/form-data", (request, payload, done) => {
    done(null);
  });

  // Load GraphQL schema - use import.meta.url to get correct path when loaded from orchestrator
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const schemaFiles = [
    // Shared types first (copied from packages/shared-references during build)
    "shared-currency.graphql",
    "shared-locale.graphql",
    "shared-units.graphql",
    // Service-specific schemas
    "relay.graphql",
    "base.graphql",
    "bucket.graphql",
    "file.graphql",
  ];

  const modules = schemaFiles.map((file) => ({
    typeDefs: gql(readFileSync(join(__dirname, file), "utf-8")),
    resolvers,
  }));

  // Create Apollo Server
  const apollo = new ApolloServer<ServiceContext>({
    introspection: true,
    schema: buildSubgraphSchema(modules),
    plugins: [fastifyApolloDrainPlugin(app)],
  });

  await apollo.start();

  // Admin context middleware - extracts store and user from headers
  app.addHook(
    "preHandler",
    buildAdminContextMiddleware({
      repository: kernel?.repository ?? null,
    })
  );

  // GraphQL multipart upload middleware
  app.addHook("preHandler", async (request, reply) => {
    // Only process multipart requests to GraphQL endpoint
    if (
      request.url === "/graphql" &&
      request.headers["content-type"]?.includes("multipart/form-data")
    ) {
      try {
        const processed = await processRequest(request.raw, reply.raw, {
          maxFileSize: 100 * 1024 * 1024, // 100MB
          maxFiles: 10,
        });
        // Attach processed body to request
        (request as any).body = processed;
        // Change content-type so Apollo Server accepts the request
        request.headers["content-type"] = "application/json";
      } catch (error) {
        reply.status(400).send({ error: "Invalid multipart request" });
      }
    }
  });

  // GraphQL endpoint
  await app.register(fastifyApollo(apollo), {
    path: "/graphql",

    context: async (request, _reply): Promise<ServiceContext> => {
      // For introspection, return minimal context
      const isIntrospection =
        request.headers["x-interpolation"] === "true" ||
        request.headers["user-agent"]?.includes("rover");

      if (isIntrospection) {
        return new ServiceContext({
          requestId: request.id as string,
          kernel: kernel as Kernel,
          loaders: null as any,
        });
      }

      // Create loaders per request for proper batching
      const loaders = new Loader(kernel!.repository);

      const ctx = new ServiceContext({
        requestId: request.id as string,
        kernel: kernel!,
        store: request.store,
        user: request.user,
        loaders,
      });

      // Set context in AsyncLocalStorage for all resolvers
      setContext(ctx);

      return ctx;
    },
  });

  // Health check endpoints
  app.get("/", async (_request, reply) => {
    return reply.send({
      status: "ok",
      service: "media",
      environment: global.environment,
    });
  });

  app.get("/healthz", async (_request, reply) => {
    return reply.send({
      status: "ok",
      service: "media",
    });
  });

  // Start server
  await app.listen({
    port: serverConfig.port,
    host: "0.0.0.0",
  });

  app.log.info(
    `Media GraphQL Admin API ready at http://localhost:${serverConfig.port}/graphql`
  );

  return app;
}
