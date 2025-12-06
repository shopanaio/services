import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import fastifyApollo, {
  fastifyApolloDrainPlugin,
} from "@as-integrations/fastify";
import fastifyMultipart from "@fastify/multipart";
import fastify from "fastify";
import { readFileSync } from "fs";
import { gql } from "graphql-tag";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type { MediaContext } from "../../context/index.js";
import { runMigrations } from "../../infrastructure/db/migrate.js";
import { ensureBucketExists, getBucketName, getS3Client, buildPublicUrl } from "../../infrastructure/s3/index.js";
import { buildAdminContextMiddleware } from "./contextMiddleware.js";
import { mediaContextPlugin } from "./mediaContextPlugin.js";
import { resolvers } from "./resolvers/index.js";
import { getServices } from "./services.js";
import { createDataLoaders, type DataLoaders } from "./dataloaders.js";
import { encodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import crypto from "node:crypto";
import { config } from "../../config.js";
import { processRequest } from "graphql-upload-minimal";
import { analyzeMedia } from "../../infrastructure/media/index.js";

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
  migrationsPath: string;
}

/**
 * Create and start GraphQL-only server
 * Uses admin context middleware that sets async local storage context
 */
export async function startServer(serverConfig: ServerConfig) {
  const isDevelopment = process.env.NODE_ENV === "development";

  // Run migrations on startup
  console.log("[media] Running database migrations...");
  await runMigrations(serverConfig.databaseUrl, serverConfig.migrationsPath);
  console.log("[media] Database migrations completed");

  // Ensure S3 bucket exists
  console.log(`[media] Checking S3 bucket '${getBucketName()}'...`);
  try {
    const created = await ensureBucketExists();
    if (created) {
      console.log(`[media] S3 bucket '${getBucketName()}' created`);
    } else {
      console.log(`[media] S3 bucket '${getBucketName()}' already exists`);
    }
  } catch (error) {
    console.error(`[media] Failed to ensure S3 bucket exists:`, error);
    // Don't fail startup - bucket might be managed externally
  }

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

  // Register multipart plugin for file uploads
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
    },
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
  app.addContentTypeParser("multipart/form-data", (request, payload, done) => {
    // Don't parse here, let graphql-upload handle it
    done(null);
  });

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

  // File upload endpoint (multipart)
  app.post("/upload", async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: "No file provided" });
      }

      const projectId = request.project?.id;
      if (!projectId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      // Read file buffer
      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      // Analyze file to get real MIME type and metadata
      const metadata = await analyzeMedia(buffer, data.mimetype);

      // Generate object key
      const timestamp = Date.now();
      const randomId = crypto.randomBytes(8).toString("hex");
      const sanitizedFilename = (data.filename || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
      const prefix = config.storage.prefix ? `${config.storage.prefix}/` : "";
      const objectKey = `${prefix}${projectId}/${timestamp}-${randomId}/${sanitizedFilename}`;

      const contentHash = crypto.createHash("sha256").update(buffer).digest("hex");

      // Upload to S3
      const s3Client = getS3Client();
      const bucketName = getBucketName();
      const uploadResult = await s3Client.putObject(
        bucketName,
        objectKey,
        buffer,
        buffer.length,
        {
          "Content-Type": metadata.mimeType,
          "x-amz-meta-content-hash": contentHash,
        }
      );

      // Get or create bucket record
      const services = getServices();
      const bucket = await services.repository.bucket.getOrCreateDefault(projectId);

      // Build public URL
      const publicUrl = buildPublicUrl(objectKey);

      // Create file record with detected metadata
      const file = await services.repository.file.create(projectId, {
        provider: "S3",
        url: publicUrl,
        mimeType: metadata.mimeType,
        ext: metadata.ext,
        sizeBytes: buffer.length,
        originalName: data.filename ?? null,
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        durationMs: metadata.durationMs ?? null,
        altText: null,
        sourceUrl: null,
        idempotencyKey: null,
        isProcessed: true,
      });

      // Create S3 object record
      await services.repository.s3Object.create(projectId, {
        fileId: file.id,
        bucketId: bucket.id,
        objectKey,
        contentHash,
        etag: uploadResult.etag,
        storageClass: "STANDARD",
      });

      // Return file with global ID
      const globalId = encodeGlobalIdByType(file.id, GlobalIdEntity.File);

      return reply.send({
        id: globalId,
        url: publicUrl,
        mimeType: metadata.mimeType,
        ext: metadata.ext,
        sizeBytes: buffer.length,
        originalName: data.filename,
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        durationMs: metadata.durationMs ?? null,
      });
    } catch (error) {
      request.log.error({ error }, "File upload failed");
      return reply.status(500).send({ error: "Upload failed" });
    }
  });

  // Health check endpoints
  app.get("/", async (_request, reply) => {
    return reply.send({ status: "ok", service: "media" });
  });

  app.get("/healthz", async (_request, reply) => {
    return reply.send({ status: "ok", service: "media" });
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
