import { eq, and, or, isNull, inArray, sql } from "drizzle-orm";
import { GraphQLError } from "graphql";
import {
  createQuery,
  createRelayQuery,
  type PageInfo,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import type { Database } from "../infrastructure/db/database";
import { files, assetGroups, type File, type NewFile } from "./models";
import { encodeGlobalIdByType, decodeGlobalId, GlobalIdEntity } from "@shopana/shared-graphql-guid";

const MAX_PAGE_SIZE = 100;

// ---- Relay Query Builder ----

export const fileRelayQuery = createRelayQuery(
  createQuery(files).include(["id"]).maxLimit(MAX_PAGE_SIZE).defaultLimit(20),
  {
    name: "file",
    tieBreaker: "id",
    seekTransforms: {
      id: {
        encode: (uuid) => encodeGlobalIdByType(uuid as string, GlobalIdEntity.File),
        decode: (globalId) => decodeGlobalId(globalId as string)?.id,
      },
    },
  },
);

export type AssetOwnerType = "organization" | "store" | "user_profile";

export type FileRelayInput = InferRelayInput<typeof fileRelayQuery> & {
  /** Owner type - defaults to "store" */
  ownerType?: AssetOwnerType;
  /** Owner ID */
  ownerId: string;
  /** File lifecycle scope used by Admin library/trash views. */
  state?: FileStateScope;
};

export type FileStateScope = "ACTIVE" | "DELETED" | "ALL";

export interface FileAccessScope {
  storeId: string;
  organizationId?: string | null;
  userId?: string | null;
}

export interface FileConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

// ---- Types ----

export type FileProvider = "S3" | "YOUTUBE" | "VIMEO" | "URL" | "LOCAL";
export type MediaType = "IMAGE" | "VIDEO" | "EXTERNAL_VIDEO" | "MODEL_3D" | "GENERIC_FILE";
export type MediaProcessingStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

function inferMediaType(data: {
  provider: FileProvider;
  mimeType?: string | null;
  ext?: string | null;
}): MediaType {
  if (data.provider === "YOUTUBE" || data.provider === "VIMEO") {
    return "EXTERNAL_VIDEO";
  }

  const mimeType = data.mimeType?.toLowerCase() ?? "";
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType.startsWith("model/")) return "MODEL_3D";

  const ext = data.ext?.toLowerCase() ?? "";
  if (["glb", "gltf", "usdz", "obj", "fbx"].includes(ext)) {
    return "MODEL_3D";
  }

  return "GENERIC_FILE";
}

export interface CreateFileInput {
  id?: string;
  provider: FileProvider;
  url: string;
  mimeType?: string | null;
  ext?: string | null;
  sizeBytes?: number;
  originalName?: string | null;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  altText?: string | null;
  mediaType?: MediaType;
  previewFileId?: string | null;
  thumbhash?: string | null;
  processingStatus?: MediaProcessingStatus;
  processingError?: string | null;
  processedAt?: string | null;
  sourceUrl?: string | null;
  idempotencyKey?: string | null;
  isProcessed?: boolean;
  meta?: Record<string, unknown> | null;
}

export interface UpdateFileInput {
  altText?: string | null;
  originalName?: string | null;
  meta?: Record<string, unknown> | null;
  isProcessed?: boolean;
  mediaType?: MediaType;
  previewFileId?: string | null;
  thumbhash?: string | null;
  processingStatus?: MediaProcessingStatus;
  processingError?: string | null;
  processedAt?: string | null;
}

// ---- Repository ----

export class FileRepository {
  constructor(private readonly db: Database) {}

  // ---- Read methods ----

  /**
   * Find a file by ID (only ACTIVE files via deletedAt IS NULL)
   */
  async findById(fileId: string): Promise<File | null> {
    const result = await this.db
      .select()
      .from(files)
      .where(and(eq(files.id, fileId), isNull(files.deletedAt)))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Find multiple files by IDs (batch load, only ACTIVE via deletedAt IS NULL)
   */
  async findByIds(ids: string[]): Promise<File[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.db
      .select()
      .from(files)
      .where(and(inArray(files.id, ids), isNull(files.deletedAt)));
  }

  /**
   * Load a file owned by one exact asset-group owner. Admin mutations use this
   * method before changing a file so a global File ID cannot cross tenants.
   */
  async findByOwner(
    fileId: string,
    ownerType: AssetOwnerType,
    ownerId: string,
    includeDeleted = false,
  ): Promise<File | null> {
    const predicates = [
      eq(files.id, fileId),
      eq(assetGroups.ownerType, ownerType),
      eq(assetGroups.ownerId, ownerId),
    ];
    if (!includeDeleted) predicates.push(isNull(files.deletedAt));

    const result = await this.db
      .select({ file: files })
      .from(files)
      .innerJoin(assetGroups, eq(files.assetGroupId, assetGroups.id))
      .where(and(...predicates))
      .limit(1);

    return result[0]?.file ?? null;
  }

  /**
   * Read scope for federated/admin file references. Store media, the current
   * organization media, and the authenticated user's profile media are visible.
   */
  async findAccessibleById(
    fileId: string,
    scope: FileAccessScope,
    includeDeleted = false,
  ): Promise<File | null> {
    const ownership = or(
      and(eq(assetGroups.ownerType, "store"), eq(assetGroups.ownerId, scope.storeId)),
      scope.organizationId
        ? and(
            eq(assetGroups.ownerType, "organization"),
            eq(assetGroups.ownerId, scope.organizationId),
          )
        : undefined,
      scope.userId
        ? and(eq(assetGroups.ownerType, "user_profile"), eq(assetGroups.ownerId, scope.userId))
        : undefined,
    );

    const result = await this.db
      .select({ file: files })
      .from(files)
      .innerJoin(assetGroups, eq(files.assetGroupId, assetGroups.id))
      .where(
        and(eq(files.id, fileId), ownership, includeDeleted ? undefined : isNull(files.deletedAt)),
      )
      .limit(1);

    return result[0]?.file ?? null;
  }

  async findAccessibleByIds(ids: readonly string[], scope: FileAccessScope): Promise<File[]> {
    if (ids.length === 0) return [];

    const ownership = or(
      and(eq(assetGroups.ownerType, "store"), eq(assetGroups.ownerId, scope.storeId)),
      scope.organizationId
        ? and(
            eq(assetGroups.ownerType, "organization"),
            eq(assetGroups.ownerId, scope.organizationId),
          )
        : undefined,
      scope.userId
        ? and(eq(assetGroups.ownerType, "user_profile"), eq(assetGroups.ownerId, scope.userId))
        : undefined,
    );

    const result = await this.db
      .select({ file: files })
      .from(files)
      .innerJoin(assetGroups, eq(files.assetGroupId, assetGroups.id))
      .where(and(inArray(files.id, [...ids]), ownership, isNull(files.deletedAt)));

    return result.map((row) => row.file);
  }

  // ---- Write methods ----

  /**
   * Create a new file or return existing one if idempotency key matches
   */
  async create(assetGroupId: string, data: CreateFileInput): Promise<File> {
    // Check for existing file by idempotency key
    if (data.idempotencyKey) {
      const existing = await this.findByIdempotencyKey(assetGroupId, data.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    // Check for existing file by source URL
    if (data.sourceUrl) {
      const existing = await this.findBySourceUrl(assetGroupId, data.sourceUrl);
      if (existing) {
        return existing;
      }
    }

    const id = data.id ?? crypto.randomUUID();
    const processingStatus = data.processingStatus ?? (data.isProcessed ? "READY" : "PENDING");

    const newFile: NewFile = {
      id,
      assetGroupId,
      provider: data.provider,
      url: data.url,
      mimeType: data.mimeType ?? null,
      ext: data.ext ?? null,
      sizeBytes: data.sizeBytes ?? 0,
      originalName: data.originalName ?? null,
      width: data.width ?? null,
      height: data.height ?? null,
      durationMs: data.durationMs ?? null,
      altText: data.altText ?? null,
      mediaType: data.mediaType ?? inferMediaType(data),
      previewFileId: data.previewFileId ?? null,
      thumbhash: data.thumbhash ?? null,
      processingStatus,
      processingError: data.processingError ?? null,
      processedAt:
        data.processedAt ?? (processingStatus === "READY" ? new Date().toISOString() : null),
      sourceUrl: data.sourceUrl ?? null,
      idempotencyKey: data.idempotencyKey ?? null,
      isProcessed: processingStatus === "READY",
      meta: data.meta ?? null,
    };

    const result = await this.db.insert(files).values(newFile).returning();

    return result[0];
  }

  /**
   * Update an existing file (only ACTIVE via deletedAt IS NULL)
   */
  async update(fileId: string, data: UpdateFileInput): Promise<File | null> {
    const updateData: Partial<NewFile> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.altText !== undefined) {
      updateData.altText = data.altText;
    }
    if (data.originalName !== undefined) {
      updateData.originalName = data.originalName;
    }
    if (data.meta !== undefined) {
      updateData.meta = data.meta;
    }
    if (data.isProcessed !== undefined) {
      updateData.isProcessed = data.isProcessed;
      updateData.processingStatus = data.isProcessed ? "READY" : "PENDING";
      updateData.processingError = null;
      updateData.processedAt = data.isProcessed ? new Date().toISOString() : null;
    }
    if (data.mediaType !== undefined) updateData.mediaType = data.mediaType;
    if (data.previewFileId !== undefined) {
      updateData.previewFileId = data.previewFileId;
    }
    if (data.thumbhash !== undefined) updateData.thumbhash = data.thumbhash;
    if (data.processingStatus !== undefined) {
      updateData.processingStatus = data.processingStatus;
      updateData.isProcessed = data.processingStatus === "READY";
      if (data.processedAt === undefined) {
        updateData.processedAt =
          data.processingStatus === "READY" ? new Date().toISOString() : null;
      }
    }
    if (data.processingError !== undefined) {
      updateData.processingError = data.processingError;
    }
    if (data.processedAt !== undefined) {
      updateData.processedAt = data.processedAt;
    }

    const result = await this.db
      .update(files)
      .set(updateData)
      .where(and(eq(files.id, fileId), isNull(files.deletedAt)))
      .returning();

    return result[0] ?? null;
  }

  /**
   * Soft delete a file (set deletedAt timestamp)
   * Note: State change to SOFT_DELETED is handled by FileDeletionStateRepository
   */
  async softDelete(fileId: string, deletedAt: Date = new Date()): Promise<void> {
    await this.db
      .update(files)
      .set({
        deletedAt: sql`COALESCE(${files.deletedAt}, ${deletedAt.toISOString()})`,
      })
      .where(and(eq(files.id, fileId), isNull(files.deletedAt)));
  }

  /**
   * Soft delete multiple files (set deletedAt timestamp)
   * Note: State change to SOFT_DELETED is handled by FileDeletionStateRepository
   */
  async softDeleteMany(fileIds: string[], deletedAt: Date = new Date()): Promise<void> {
    if (fileIds.length === 0) {
      return;
    }

    await this.db
      .update(files)
      .set({
        deletedAt: sql`COALESCE(${files.deletedAt}, ${deletedAt.toISOString()})`,
      })
      .where(and(inArray(files.id, fileIds), isNull(files.deletedAt)));
  }

  /**
   * Hard delete a file (permanent removal)
   */
  async hardDelete(fileId: string): Promise<boolean> {
    const result = await this.db
      .delete(files)
      .where(eq(files.id, fileId))
      .returning({ id: files.id });

    return result.length > 0;
  }

  /**
   * Restore a soft-deleted file (clear deletedAt)
   * Note: State change to ACTIVE is handled by FileDeletionStateRepository
   */
  async restore(fileId: string): Promise<void> {
    await this.db.update(files).set({ deletedAt: null }).where(eq(files.id, fileId));
  }

  // ---- Utility methods ----

  /**
   * Find a file by idempotency key within an asset group (ACTIVE only)
   */
  async findByIdempotencyKey(assetGroupId: string, key: string): Promise<File | null> {
    const result = await this.db
      .select()
      .from(files)
      .where(
        and(
          eq(files.assetGroupId, assetGroupId),
          eq(files.idempotencyKey, key),
          isNull(files.deletedAt),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Check if an ACTIVE file exists
   */
  async exists(fileId: string): Promise<boolean> {
    const result = await this.db
      .select({ id: files.id })
      .from(files)
      .where(and(eq(files.id, fileId), isNull(files.deletedAt)))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Find a file by source URL within an asset group (for deduplication, ACTIVE only)
   */
  async findBySourceUrl(assetGroupId: string, sourceUrl: string): Promise<File | null> {
    if (!sourceUrl) {
      return null;
    }

    const result = await this.db
      .select()
      .from(files)
      .where(
        and(
          eq(files.assetGroupId, assetGroupId),
          eq(files.sourceUrl, sourceUrl),
          isNull(files.deletedAt),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Find a file by ID in any state (including deleted)
   */
  async findAnyById(fileId: string): Promise<File | null> {
    const result = await this.db.select().from(files).where(eq(files.id, fileId)).limit(1);

    return result[0] ?? null;
  }

  // ---- Connection methods ----

  /**
   * Resolve asset group ID from owner type and owner ID
   */
  private async resolveAssetGroupId(
    ownerType: AssetOwnerType,
    ownerId: string,
  ): Promise<string | null> {
    const result = await this.db
      .select({ id: assetGroups.id })
      .from(assetGroups)
      .where(and(eq(assetGroups.ownerType, ownerType), eq(assetGroups.ownerId, ownerId)))
      .limit(1);

    return result[0]?.id ?? null;
  }

  /**
   * Get files with Relay-style cursor pagination
   */
  async getConnection(args: FileRelayInput): Promise<FileConnectionResult> {
    const {
      where,
      orderBy,
      ownerType = "store",
      ownerId,
      state = "ACTIVE",
      ...paginationArgs
    } = args;

    const requestedLimit = paginationArgs.first ?? paginationArgs.last;
    if (requestedLimit !== undefined && requestedLimit !== null && requestedLimit > MAX_PAGE_SIZE) {
      throw new GraphQLError(
        `Requested page size ${requestedLimit} exceeds the maximum allowed size of ${MAX_PAGE_SIZE}`,
        { extensions: { code: "PAGE_SIZE_TOO_LARGE" } },
      );
    }

    // Resolve asset group ID from owner type + owner ID
    const assetGroupId = await this.resolveAssetGroupId(ownerType, ownerId);

    // If no asset group found, return empty result
    if (!assetGroupId) {
      return {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
        totalCount: 0,
      };
    }

    // Merge user-provided where with assetGroupId and deletedAt filters
    const stateWhere =
      state === "ACTIVE"
        ? { deletedAt: { _is: null } }
        : state === "DELETED"
          ? { deletedAt: { _isNot: null } }
          : null;

    const mergedWhere: FileRelayInput["where"] = {
      _and: [
        ...(stateWhere ? [stateWhere] : []),
        { assetGroupId: { _eq: assetGroupId } },
        ...(where ? [where] : []),
      ],
    };

    const executeInput = {
      ...paginationArgs,
      where: mergedWhere,
      orderBy:
        orderBy ??
        ([
          { field: "createdAt", direction: "desc" },
          { field: "id", direction: "desc" },
        ] as FileRelayInput["orderBy"]),
    };

    // Execute paginated query and count with the same filters in parallel
    const [result, totalCount] = await Promise.all([
      fileRelayQuery.execute(this.db, executeInput),
      fileRelayQuery.count(this.db, { where: mergedWhere }),
    ]);

    return {
      edges: result.edges.map((edge) => ({
        cursor: edge.cursor,
        nodeId: edge.node.id,
      })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }
}
