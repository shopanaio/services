import { eq, and, isNull, inArray, sql } from "drizzle-orm";
import {
  createQuery,
  createRelayQuery,
  type PageInfo,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import type { Database } from "../infrastructure/db/database";
import { files, assetGroups, type File, type NewFile } from "./models";
import {
  encodeGlobalIdByType,
  decodeGlobalId,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";

// ---- Relay Query Builder ----

export const fileRelayQuery = createRelayQuery(
  createQuery(files).include(["id"]).maxLimit(100).defaultLimit(20),
  {
    name: "file",
    tieBreaker: "id",
    seekTransforms: {
      id: {
        encode: (uuid) => encodeGlobalIdByType(uuid as string, GlobalIdEntity.File),
        decode: (globalId) => decodeGlobalId(globalId as string)?.id,
      },
    },
  }
);

export type AssetOwnerType = "organization" | "store" | "user_profile";

export type FileRelayInput = InferRelayInput<typeof fileRelayQuery> & {
  /** Owner type - defaults to "store" */
  ownerType?: AssetOwnerType;
  /** Owner ID */
  ownerId: string;
};

export interface FileConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

// ---- Types ----

export type FileProvider = "S3" | "YOUTUBE" | "VIMEO" | "URL" | "LOCAL";

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
}

// ---- Repository ----

export class FileRepository {
  constructor(private readonly db: Database) {}

  // ---- Read methods ----

  /**
   * Find a file by ID
   */
  async findById(fileId: string): Promise<File | null> {
    const result = await this.db
      .select()
      .from(files)
      .where(
        and(
          eq(files.id, fileId),
          isNull(files.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Find multiple files by IDs (batch load)
   */
  async findByIds(ids: string[]): Promise<File[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.db
      .select()
      .from(files)
      .where(
        and(
          inArray(files.id, ids),
          isNull(files.deletedAt)
        )
      );
  }

  // ---- Write methods ----

  /**
   * Create a new file or return existing one if idempotency key matches
   */
  async create(assetGroupId: string, data: CreateFileInput): Promise<File> {
    // Check for existing file by idempotency key
    if (data.idempotencyKey) {
      const existing = await this.findByIdempotencyKey(
        assetGroupId,
        data.idempotencyKey
      );
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
      sourceUrl: data.sourceUrl ?? null,
      idempotencyKey: data.idempotencyKey ?? null,
      isProcessed: data.isProcessed ?? false,
      meta: data.meta ?? null,
    };

    const result = await this.db.insert(files).values(newFile).returning();

    return result[0];
  }

  /**
   * Update an existing file
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
    }

    const result = await this.db
      .update(files)
      .set(updateData)
      .where(
        and(
          eq(files.id, fileId),
          isNull(files.deletedAt)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  /**
   * Soft delete a file (set deletedAt)
   */
  async softDelete(fileId: string): Promise<void> {
    await this.db
      .update(files)
      .set({
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(files.id, fileId),
          isNull(files.deletedAt)
        )
      );
  }

  /**
   * Hard delete a file (permanent removal)
   */
  async hardDelete(fileId: string): Promise<void> {
    await this.db
      .delete(files)
      .where(eq(files.id, fileId));
  }

  // ---- Utility methods ----

  /**
   * Find a file by idempotency key within an asset group
   */
  async findByIdempotencyKey(
    assetGroupId: string,
    key: string
  ): Promise<File | null> {
    const result = await this.db
      .select()
      .from(files)
      .where(
        and(
          eq(files.assetGroupId, assetGroupId),
          eq(files.idempotencyKey, key),
          isNull(files.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Check if a file exists
   */
  async exists(fileId: string): Promise<boolean> {
    const result = await this.db
      .select({ id: files.id })
      .from(files)
      .where(
        and(
          eq(files.id, fileId),
          isNull(files.deletedAt)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Find a file by source URL within an asset group (for deduplication)
   */
  async findBySourceUrl(
    assetGroupId: string,
    sourceUrl: string
  ): Promise<File | null> {
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
          isNull(files.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Find deleted file by ID (for restoration purposes)
   */
  async findDeletedById(fileId: string): Promise<File | null> {
    const result = await this.db
      .select()
      .from(files)
      .where(
        and(
          eq(files.id, fileId),
          sql`${files.deletedAt} IS NOT NULL`
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Restore a soft-deleted file
   */
  async restore(fileId: string): Promise<File | null> {
    const result = await this.db
      .update(files)
      .set({
        deletedAt: null,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(files.id, fileId),
          sql`${files.deletedAt} IS NOT NULL`
        )
      )
      .returning();

    return result[0] ?? null;
  }

  // ---- Connection methods ----

  /**
   * Resolve asset group ID from owner type and owner ID
   */
  private async resolveAssetGroupId(
    ownerType: AssetOwnerType,
    ownerId: string
  ): Promise<string | null> {
    const result = await this.db
      .select({ id: assetGroups.id })
      .from(assetGroups)
      .where(
        and(
          eq(assetGroups.ownerType, ownerType),
          eq(assetGroups.ownerId, ownerId)
        )
      )
      .limit(1);

    return result[0]?.id ?? null;
  }

  /**
   * Get files with Relay-style cursor pagination
   */
  async getConnection(args: FileRelayInput): Promise<FileConnectionResult> {
    const { where, orderBy, ownerType = "store", ownerId, ...paginationArgs } = args;

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
    const mergedWhere: FileRelayInput["where"] = {
      _and: [
        { deletedAt: { _is: null } },
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
