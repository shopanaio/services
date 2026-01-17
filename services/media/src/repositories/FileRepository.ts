import { eq, and, isNull, inArray, sql, lt, or, isNotNull } from "drizzle-orm";
import {
  createQuery,
  createRelayQuery,
  type PageInfo,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import type { Database } from "../infrastructure/db/database";
import { files, assetGroups, type File, type NewFile } from "./models";
import type {
  DeletionErrorCode,
  FindSoftDeletedForGCParams,
  MarkDeletingResult,
  ResetStuckDeletingParams,
  RestoreResult,
} from "../types/deletion.js";
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
          eq(files.deletionState, "ACTIVE")
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
          eq(files.deletionState, "ACTIVE")
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
          eq(files.deletionState, "ACTIVE")
        )
      )
      .returning();

    return result[0] ?? null;
  }

  /**
   * Soft delete a file (set deletedAt)
   */
  async softDelete(fileId: string): Promise<void> {
    await this.softDeleteIfEligible(fileId, new Date());
  }

  /**
   * Hard delete a file (permanent removal)
   */
  async hardDelete(fileId: string): Promise<void> {
    await this.db
      .delete(files)
      .where(eq(files.id, fileId));
  }

  /**
   * Soft delete a file if it is ACTIVE
   */
  async softDeleteIfEligible(
    fileId: string,
    deletedAt: Date
  ): Promise<string | null> {
    const result = await this.db
      .update(files)
      .set({
        deletionState: "SOFT_DELETED",
        deletedAt: sql`COALESCE(${files.deletedAt}, ${deletedAt.toISOString()})`,
      })
      .where(
        and(eq(files.id, fileId), eq(files.deletionState, "ACTIVE"))
      )
      .returning({ id: files.id });

    return result[0]?.id ?? null;
  }

  /**
   * Soft delete multiple files if they are ACTIVE
   */
  async softDeleteManyIfEligible(
    fileIds: string[],
    deletedAt: Date
  ): Promise<string[]> {
    if (fileIds.length === 0) {
      return [];
    }

    const result = await this.db
      .update(files)
      .set({
        deletionState: "SOFT_DELETED",
        deletedAt: sql`COALESCE(${files.deletedAt}, ${deletedAt.toISOString()})`,
      })
      .where(
        and(inArray(files.id, fileIds), eq(files.deletionState, "ACTIVE"))
      )
      .returning({ id: files.id });

    return result.map((row) => row.id);
  }

  /**
   * Mark a SOFT_DELETED file as DELETING and return the started_at timestamp
   */
  async markDeletingReturningStartedAt(
    fileId: string
  ): Promise<MarkDeletingResult | null> {
    const result = await this.db
      .update(files)
      .set({
        deletionState: "DELETING",
        deletingStartedAt: sql`now()`,
        deletionErrorCode: null,
        failedAt: null,
        lastDeletionError: null,
      })
      .where(
        and(eq(files.id, fileId), eq(files.deletionState, "SOFT_DELETED"))
      )
      .returning({ startedAt: files.deletingStartedAt });

    if (!result[0]?.startedAt) {
      return null;
    }

    return { startedAt: new Date(result[0].startedAt) };
  }

  /**
   * Verify DELETING lock with DB-side timestamp comparison
   */
  async isDeletionLockValid(
    fileId: string,
    expectedStartedAt: Date
  ): Promise<boolean> {
    const result = await this.db.execute<{ exists: boolean }>(sql`
      SELECT EXISTS (
        SELECT 1 FROM media.files
        WHERE id = ${fileId}
          AND deletion_state = 'DELETING'
          AND deleting_started_at = ${expectedStartedAt.toISOString()}
      ) as exists
    `);

    return result.rows[0]?.exists ?? false;
  }

  /**
   * Roll back a DELETING file to SOFT_DELETED with error attributes
   */
  async markErrorAndRollback(
    fileId: string,
    errorCode: DeletionErrorCode,
    errorMessage: string
  ): Promise<boolean> {
    const result = await this.db
      .update(files)
      .set({
        deletionState: "SOFT_DELETED",
        deletionErrorCode: errorCode,
        lastDeletionError: errorMessage,
        failedAt: sql`now()`,
        deletingStartedAt: null,
      })
      .where(
        and(eq(files.id, fileId), eq(files.deletionState, "DELETING"))
      )
      .returning({ id: files.id });

    return result.length > 0;
  }

  /**
   * Hard delete only if the file is DELETING
   */
  async hardDeleteIfDeleting(fileId: string): Promise<boolean> {
    const result = await this.db
      .delete(files)
      .where(
        and(eq(files.id, fileId), eq(files.deletionState, "DELETING"))
      )
      .returning({ id: files.id });

    return result.length > 0;
  }

  /**
   * Find SOFT_DELETED files eligible for GC
   */
  async findSoftDeletedForGC(
    params: FindSoftDeletedForGCParams
  ): Promise<File[]> {
    return this.db
      .select()
      .from(files)
      .where(
        and(
          eq(files.deletionState, "SOFT_DELETED"),
          lt(files.deletedAt, params.cutoffDate.toISOString()),
          or(
            isNull(files.deletionErrorCode),
            and(
              eq(files.deletionErrorCode, "RETRYABLE"),
              isNotNull(files.failedAt),
              lt(files.failedAt, params.errorCooldown.toISOString())
            )
          )
        )
      )
      .orderBy(files.deletedAt, files.id)
      .limit(params.limit);
  }

  /**
   * Reset DELETING files that are stuck beyond timeout
   */
  async resetStuckDeleting(params: ResetStuckDeletingParams): Promise<number> {
    const result = await this.db.execute<{ id: string }>(sql`
      WITH cte AS (
        SELECT id FROM media.files
        WHERE deletion_state = 'DELETING'
          AND deleting_started_at IS NOT NULL
          AND deleting_started_at < ${params.stuckSince.toISOString()}
        ORDER BY deleting_started_at, id
        LIMIT ${params.limit}
      )
      UPDATE media.files f
      SET
        deletion_state = 'SOFT_DELETED',
        deleting_started_at = NULL,
        deletion_error_code = 'RETRYABLE',
        failed_at = now(),
        last_deletion_error = 'stuck deleting timeout'
      FROM cte
      WHERE f.id = cte.id
      RETURNING f.id
    `);

    return result.rowCount ?? 0;
  }

  /**
   * Clear error attributes on SOFT_DELETED files
   */
  async clearError(fileId: string): Promise<boolean> {
    const result = await this.db
      .update(files)
      .set({
        deletionErrorCode: null,
        lastDeletionError: null,
        failedAt: null,
      })
      .where(
        and(
          eq(files.id, fileId),
          eq(files.deletionState, "SOFT_DELETED"),
          isNotNull(files.deletionErrorCode)
        )
      )
      .returning({ id: files.id });

    return result.length > 0;
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
          eq(files.deletionState, "ACTIVE")
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
          eq(files.deletionState, "ACTIVE")
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
          eq(files.deletionState, "ACTIVE")
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
          eq(files.deletionState, "SOFT_DELETED")
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Find a file by ID in any state
   */
  async findAnyById(fileId: string): Promise<File | null> {
    const result = await this.db
      .select()
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Restore a soft-deleted file
   */
  async restore(fileId: string): Promise<RestoreResult> {
    const current = await this.findAnyById(fileId);
    if (!current) {
      return { success: false, error: "INVALID_STATE" };
    }
    if (current.deletionState === "DELETING") {
      return { success: false, error: "FILE_BEING_DELETED" };
    }
    if (current.deletionState === "ACTIVE") {
      return { success: false, error: "INVALID_STATE" };
    }

    await this.db
      .update(files)
      .set({
        deletionState: "ACTIVE",
        deletedAt: null,
        deletionErrorCode: null,
        lastDeletionError: null,
        failedAt: null,
        deletingStartedAt: null,
      })
      .where(eq(files.id, fileId));

    return { success: true };
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

    // Merge user-provided where with assetGroupId and deletionState filters
    const mergedWhere: FileRelayInput["where"] = {
      _and: [
        { deletionState: { _eq: "ACTIVE" } },
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
