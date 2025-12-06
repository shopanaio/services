import {
  encodeGlobalIdByType,
  GlobalIdEntity,
  parseGlobalId,
} from "@shopana/shared-graphql-guid";
import { GraphQLUpload, type FileUpload } from "graphql-upload-minimal";
import type { File } from "../../../repositories/models/index.js";
import {
  bucketCreate,
  fileCreateExternal,
  fileDelete,
  fileUpdate,
  fileUploadFromUrl,
  fileUploadMultipart,
} from "../../../scripts/index.js";
import type { GraphQLContext } from "../server.js";
import { getServices } from "../services.js";

// ---- Global ID utilities ----

type NodeType = "File";

function encodeGlobalId(type: NodeType, id: string): string {
  return encodeGlobalIdByType(id, GlobalIdEntity[type]);
}

function decodeGlobalId(
  globalId: string
): { type: NodeType; id: string } | null {
  try {
    const parsed = parseGlobalId(globalId);
    if (parsed.typeName === GlobalIdEntity.File) {
      return { type: "File", id: parsed.id };
    }
    return null;
  } catch {
    return null;
  }
}

// ---- Helper to convert DB File to GraphQL File ----

function dbFileToGraphQL(file: File): Record<string, unknown> {
  return {
    ...file,
    id: encodeGlobalId("File", file.id),
    sizeBytes: file.sizeBytes.toString(),
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
    deletedAt: file.deletedAt?.toISOString() ?? null,
  };
}

// ---- Resolvers ----

export const resolvers = {
  Query: {
    mediaQuery: () => ({}),
  },

  Mutation: {
    mediaMutation: () => ({}),
  },

  MediaQuery: {
    /**
     * Get a node by its global ID (Relay Node interface)
     */
    node: async (
      _parent: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ) => {
      const decoded = decodeGlobalId(id);
      if (!decoded) {
        return null;
      }

      const services = getServices();
      const projectId = ctx.project.id;

      if (decoded.type === "File") {
        const file = await services.repository.file.findById(
          projectId,
          decoded.id
        );
        return file ? dbFileToGraphQL(file) : null;
      }

      return null;
    },

    /**
     * Get multiple nodes by their global IDs (Relay Node interface)
     */
    nodes: async (
      _parent: unknown,
      { ids }: { ids: string[] },
      ctx: GraphQLContext
    ) => {
      const services = getServices();
      const projectId = ctx.project.id;

      // Group IDs by type
      const fileIds: string[] = [];
      const idIndexMap = new Map<string, number>();

      for (let i = 0; i < ids.length; i++) {
        const decoded = decodeGlobalId(ids[i]);
        if (decoded?.type === "File") {
          fileIds.push(decoded.id);
          idIndexMap.set(decoded.id, i);
        }
      }

      // Batch fetch files
      const files = await services.repository.file.findByIds(
        projectId,
        fileIds
      );
      const fileMap = new Map(files.map((f) => [f.id, f]));

      // Build result array preserving order
      const result: (Record<string, unknown> | null)[] = new Array(
        ids.length
      ).fill(null);

      for (const [fileId, index] of idIndexMap) {
        const file = fileMap.get(fileId);
        if (file) {
          result[index] = dbFileToGraphQL(file);
        }
      }

      return result;
    },

    /**
     * Get a single file by ID
     */
    file: async (
      _parent: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ) => {
      const decoded = decodeGlobalId(id);
      if (!decoded || decoded.type !== "File") {
        return null;
      }

      const services = getServices();
      const file = await services.repository.file.findById(
        ctx.project.id,
        decoded.id
      );

      return file ? dbFileToGraphQL(file) : null;
    },

    /**
     * Get files with Relay-style cursor pagination
     */
    files: async (
      _parent: unknown,
      args: {
        first?: number;
        after?: string;
        last?: number;
        before?: string;
      },
      ctx: GraphQLContext
    ) => {
      const services = getServices();
      const connection = await services.repository.file.findAll(
        ctx.project.id,
        args
      );

      return {
        edges: connection.edges.map((edge) => ({
          node: dbFileToGraphQL(edge.node),
          cursor: edge.cursor,
        })),
        pageInfo: connection.pageInfo,
        totalCount: connection.totalCount,
      };
    },
  },

  MediaMutation: {
    /**
     * Create a bucket
     */
    bucketCreate: async (
      _parent: unknown,
      {
        input,
      }: {
        input: {
          bucketName: string;
          region?: string;
          status?: string;
          priority?: number;
          endpointUrl?: string;
        };
      },
      ctx: GraphQLContext
    ) => {
      const services = getServices();

      const result = await bucketCreate(
        {
          bucketName: input.bucketName,
          region: input.region,
          status: input.status,
          priority: input.priority,
          endpointUrl: input.endpointUrl,
        },
        services
      );

      if (result.bucket) {
        const bucket = await services.repository.bucket.findById(
          ctx.project.id,
          result.bucket.id
        );
        return {
          bucket: bucket
            ? {
                ...bucket,
                createdAt: bucket.createdAt.toISOString(),
                updatedAt: bucket.updatedAt.toISOString(),
              }
            : null,
          userErrors: result.userErrors,
        };
      }

      return {
        bucket: null,
        userErrors: result.userErrors,
      };
    },

    /**
     * Upload a file via multipart form data (main upload method)
     */
    fileUpload: async (
      _parent: unknown,
      {
        input,
      }: {
        input: {
          file: Promise<FileUpload>;
          altText?: string;
          idempotencyKey?: string;
        };
      },
      ctx: GraphQLContext
    ) => {
      const services = getServices();

      const result = await fileUploadMultipart(
        {
          file: input.file,
          altText: input.altText,
          idempotencyKey: input.idempotencyKey,
        },
        services
      );

      if (result.file) {
        const file = await services.repository.file.findById(
          ctx.project.id,
          result.file.id
        );
        return {
          file: file ? dbFileToGraphQL(file) : null,
          userErrors: result.userErrors,
        };
      }

      return {
        file: null,
        userErrors: result.userErrors,
      };
    },

    /**
     * Upload a file from URL
     */
    fileUploadFromUrl: async (
      _parent: unknown,
      {
        input,
      }: {
        input: {
          sourceUrl: string;
          altText?: string;
          idempotencyKey?: string;
        };
      },
      ctx: GraphQLContext
    ) => {
      const services = getServices();

      const result = await fileUploadFromUrl(
        {
          sourceUrl: input.sourceUrl,
          altText: input.altText,
          idempotencyKey: input.idempotencyKey,
        },
        services
      );

      if (result.file) {
        const file = await services.repository.file.findById(
          ctx.project.id,
          result.file.id
        );
        return {
          file: file ? dbFileToGraphQL(file) : null,
          userErrors: result.userErrors,
        };
      }

      return {
        file: null,
        userErrors: result.userErrors,
      };
    },

    /**
     * Create an external media file (YouTube, Vimeo, etc.)
     */
    fileCreateExternal: async (
      _parent: unknown,
      {
        input,
      }: {
        input: {
          provider: string;
          externalId: string;
          url: string;
          thumbnailUrl?: string;
          originalName?: string;
          width?: number;
          height?: number;
          durationMs?: number;
          altText?: string;
          providerMeta?: Record<string, unknown>;
          idempotencyKey?: string;
        };
      },
      ctx: GraphQLContext
    ) => {
      const services = getServices();

      const result = await fileCreateExternal(
        {
          provider: input.provider,
          externalId: input.externalId,
          url: input.url,
          thumbnailUrl: input.thumbnailUrl,
          originalName: input.originalName,
          width: input.width,
          height: input.height,
          durationMs: input.durationMs,
          altText: input.altText,
          providerMeta: input.providerMeta,
          idempotencyKey: input.idempotencyKey,
        },
        services
      );

      if (result.file) {
        const file = await services.repository.file.findById(
          ctx.project.id,
          result.file.id
        );
        return {
          file: file ? dbFileToGraphQL(file) : null,
          userErrors: result.userErrors,
        };
      }

      return {
        file: null,
        userErrors: result.userErrors,
      };
    },

    /**
     * Update a file's metadata
     */
    fileUpdate: async (
      _parent: unknown,
      {
        input,
      }: {
        input: {
          id: string;
          altText?: string;
          originalName?: string;
          meta?: Record<string, unknown>;
        };
      },
      ctx: GraphQLContext
    ) => {
      const decoded = decodeGlobalId(input.id);
      if (!decoded || decoded.type !== "File") {
        return {
          file: null,
          userErrors: [
            { message: "Invalid file ID", field: ["id"], code: "INVALID_ID" },
          ],
        };
      }

      const services = getServices();

      const result = await fileUpdate(
        {
          id: decoded.id,
          altText: input.altText,
          originalName: input.originalName,
          meta: input.meta,
        },
        services
      );

      if (result.file) {
        const file = await services.repository.file.findById(
          ctx.project.id,
          result.file.id
        );
        return {
          file: file ? dbFileToGraphQL(file) : null,
          userErrors: result.userErrors,
        };
      }

      return {
        file: null,
        userErrors: result.userErrors,
      };
    },

    /**
     * Delete a file (soft or hard delete)
     */
    fileDelete: async (
      _parent: unknown,
      {
        input,
      }: {
        input: {
          id: string;
          permanent?: boolean;
        };
      },
      _ctx: GraphQLContext
    ) => {
      const decoded = decodeGlobalId(input.id);
      if (!decoded || decoded.type !== "File") {
        return {
          deletedFileId: null,
          userErrors: [
            { message: "Invalid file ID", field: ["id"], code: "INVALID_ID" },
          ],
        };
      }

      const services = getServices();

      const result = await fileDelete(
        {
          id: decoded.id,
          permanent: input.permanent,
        },
        services
      );

      return {
        deletedFileId: result.deletedFileId
          ? encodeGlobalId("File", result.deletedFileId)
          : null,
        userErrors: result.userErrors,
      };
    },
  },

  // ---- Type Resolvers ----

  File: {
    /**
     * Federation: resolve file reference from other subgraphs
     */
    __resolveReference: async (
      reference: { id: string },
      ctx: GraphQLContext
    ) => {
      const decoded = decodeGlobalId(reference.id);
      if (!decoded || decoded.type !== "File") {
        return null;
      }

      // Use DataLoader if available, otherwise fall back to direct query
      if (ctx.loaders) {
        const file = await ctx.loaders.fileLoader.load(decoded.id);
        return file ? dbFileToGraphQL(file) : null;
      }

      const services = getServices();
      const file = await services.repository.file.findById(
        ctx.project.id,
        decoded.id
      );
      return file ? dbFileToGraphQL(file) : null;
    },

    /**
     * Resolve dimensions from width/height fields
     */
    dimensions: (parent: { width?: number | null; height?: number | null }) => {
      if (parent.width && parent.height) {
        return { width: parent.width, height: parent.height };
      }
      return null;
    },

    /**
     * Resolve S3 data for S3 provider files
     */
    s3Data: async (
      parent: { id: string; provider: string },
      _args: unknown,
      ctx: GraphQLContext
    ) => {
      if (parent.provider !== "S3") {
        return null;
      }

      // Extract raw ID from global ID
      const decoded = decodeGlobalId(parent.id);
      const rawId = decoded?.id ?? parent.id;

      // Use DataLoader if available
      if (ctx.loaders) {
        return ctx.loaders.s3ObjectLoader.load(rawId);
      }

      const services = getServices();
      return services.repository.s3Object.findByFileId(ctx.project.id, rawId);
    },

    /**
     * Resolve external media data for YouTube/Vimeo/URL providers
     */
    externalData: async (
      parent: { id: string; provider: string },
      _args: unknown,
      ctx: GraphQLContext
    ) => {
      if (!["YOUTUBE", "VIMEO", "URL"].includes(parent.provider)) {
        return null;
      }

      // Extract raw ID from global ID
      const decoded = decodeGlobalId(parent.id);
      const rawId = decoded?.id ?? parent.id;

      // Use DataLoader if available
      if (ctx.loaders) {
        return ctx.loaders.externalMediaLoader.load(rawId);
      }

      const services = getServices();
      return services.repository.externalMedia.findByFileId(
        ctx.project.id,
        rawId
      );
    },
  },

  // ---- Interface Resolvers ----

  Node: {
    __resolveType: (obj: Record<string, unknown>) => {
      if ("provider" in obj) return "File";
      return null;
    },
  },

  UserError: {
    __resolveType: () => "GenericUserError",
  },

  // ---- Scalar Resolvers ----
  Upload: GraphQLUpload,
};
