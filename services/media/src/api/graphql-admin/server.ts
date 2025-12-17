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
import type { MediaContext } from "../../context/index.js";
import { getBucketName } from "../../infrastructure/s3/index.js";
import { buildAdminContextMiddleware } from "./contextMiddleware.js";

const { service, global } = getServiceConfig("media");
const storageConfig = service.s3 ? buildS3Config(service.s3) : null;
import { mediaContextPlugin } from "./mediaContextPlugin.js";
import { resolvers } from "./resolvers/index.js";
import { getServices, initServices } from "./services.js";
import { createDataLoaders, type DataLoaders } from "./dataloaders.js";
import { processRequest } from "graphql-upload-minimal";

export interface GraphQLContext {
  requestId: string;
  slug: string;
  project: MediaContext["project"];
  user: MediaContext["user"];
  loaders: DataLoaders | null;
}

export interface ServerConfig {
  port: number;
  grpcHost?: string;
  databaseUrl: string;
}

/**
 * Create and start GraphQL-only server
 * Uses admin context middleware that sets async local storage context
 */
export async function startServer(serverConfig: ServerConfig) {

  // Initialize services (repository, etc.)
  const services = initServices();

  // Ensure bucket record exists in database (for default/system bucket)
  const bucketName = getBucketName();
  console.log(`[media] Checking bucket record '${bucketName}' in database...`);
  try {
    const existingBucket = await services.repository.bucket.findByBucketName(bucketName);
    if (!existingBucket) {
      // Create a system-level bucket record
      // Using a fixed UUID for the system project
      const SYSTEM_PROJECT_ID = "00000000-0000-0000-0000-000000000000";
      await services.repository.bucket.create(SYSTEM_PROJECT_ID, {
        bucketName,
        region: storageConfig?.region ?? "us-east-1",
        status: "active",
        endpointUrl: storageConfig?.endpoint ?? "",
      });
      console.log(`[media] Bucket record '${bucketName}' created in database`);
    } else {
      console.log(`[media] Bucket record '${bucketName}' already exists in database`);
    }
  } catch (error) {
    console.error(`[media] Failed to ensure bucket record exists:`, error);
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
              messageFormat: '[MEDIA] {msg}',
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
  const schemaFiles = ["relay.graphql", "base.graphql", "bucket.graphql", "file.graphql"];

  const modules = schemaFiles.map((file) => ({
    typeDefs: gql(readFileSync(join(__dirname, file), "utf-8")),
    resolvers,
  }));

  // Create Apollo Server
  const apollo = new ApolloServer<GraphQLContext>({
    introspection: true,
    schema: buildSubgraphSchema(modules),
    plugins: [fastifyApolloDrainPlugin(app), mediaContextPlugin()],
  });

  await apollo.start();

  // Admin context middleware
  const grpcConfig = {
    getGrpcHost: () =>
      serverConfig.grpcHost ?? process.env.PLATFORM_GRPC_HOST ?? "localhost:50051",
  };
  app.addHook("preHandler", buildAdminContextMiddleware(grpcConfig));

  // GraphQL multipart upload middleware
  app.addHook("preHandler", async (request, reply) => {
    // Only process multipart requests to GraphQL endpoint
    if (
      request.url === "/graphql/admin" &&
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
    path: "/graphql/admin",

    context: async (request, _reply): Promise<GraphQLContext> => {
      // For introspection, return minimal context
      const isIntrospection =
        request.headers["x-interpolation"] === "true" ||
        request.headers["user-agent"]?.includes("rover");

      if (isIntrospection) {
        return {
          requestId: request.id as string,
          slug: "",
          project: null as any,
          user: null as any,
          loaders: null,
        };
      }

      // Create DataLoaders for this request
      const services = getServices();
      const loaders = createDataLoaders(
        request.project.id,
        services.repository
      );

      return {
        requestId: request.id as string,
        slug: request.headers["x-pj-key"] as string,
        project: request.project,
        user: request.user,
        loaders,
      };
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
