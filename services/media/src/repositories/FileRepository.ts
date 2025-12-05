import { eq, and, isNull, inArray, desc, asc, sql, count } from "drizzle-orm";
import type { Database } from "../infrastructure/db/database";
import { files, type File, type NewFile } from "./models";

// ---- Types ----

export type FileProvider = "S3" | "YOUTUBE" | "VIMEO" | "URL" | "LOCAL";

export interface FileFilter {
  provider?: FileProvider;
  mimeType?: string;
  isProcessed?: boolean;
  includeDeleted?: boolean;
}

export interface FindAllOptions {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  filter?: FileFilter;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface FileEdge {
  node: File;
  cursor: string;
}

export interface FileConnection {
  edges: FileEdge[];
  pageInfo: PageInfo;
  totalCount: number;
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

// ---- Cursor utilities ----

function encodeCursor(id: string, createdAt: Date): string {
  return Buffer.from(JSON.stringify({ id, createdAt: createdAt.toISOString() })).toString("base64");
}

function decodeCursor(cursor: string): { id: string; createdAt: Date } | null {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf8"));
    return {
      id: decoded.id,
      createdAt: new Date(decoded.createdAt),
    };
  } catch {
    return null;
  }
}

// ---- Repository ----

export class FileRepository {
  constructor(private readonly db: Database) {}

  // ---- Read methods ----

  /**
   * Find a file by ID within a project
   */
  async findById(projectId: string, fileId: string): Promise<File | null> {
    const result = await this.db
      .select()
      .from(files)
      .where(
        and(
          eq(files.projectId, projectId),
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
  async findByIds(projectId: string, ids: string[]): Promise<File[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.db
      .select()
      .from(files)
      .where(
        and(
          eq(files.projectId, projectId),
          inArray(files.id, ids),
          isNull(files.deletedAt)
        )
      );
  }

  /**
   * Find all files with Relay-style cursor pagination
   */
  async findAll(projectId: string, options: FindAllOptions = {}): Promise<FileConnection> {
    const { first, after, last, before, filter } = options;

    // Build base conditions
    const conditions = [eq(files.projectId, projectId)];

    // Include/exclude deleted
    if (!filter?.includeDeleted) {
      conditions.push(isNull(files.deletedAt));
    }

    // Apply filters
    if (filter?.provider) {
      conditions.push(eq(files.provider, filter.provider));
    }
    if (filter?.mimeType) {
      conditions.push(eq(files.mimeType, filter.mimeType));
    }
    if (filter?.isProcessed !== undefined) {
      conditions.push(eq(files.isProcessed, filter.isProcessed));
    }

    // Get total count
    const countResult = await this.db
      .select({ count: count() })
      .from(files)
      .where(and(...conditions));
    const totalCount = countResult[0]?.count ?? 0;

    // Determine pagination direction and limit
    const isForward = first !== undefined || (!last && !before);
    const limit = first ?? last ?? 20;

    // Apply cursor conditions
    if (after) {
      const cursor = decodeCursor(after);
      if (cursor) {
        // Forward pagination: get items after this cursor (older items)
        conditions.push(
          sql`(${files.createdAt}, ${files.id}) < (${cursor.createdAt}, ${cursor.id})`
        );
      }
    }
    if (before) {
      const cursor = decodeCursor(before);
      if (cursor) {
        // Backward pagination: get items before this cursor (newer items)
        conditions.push(
          sql`(${files.createdAt}, ${files.id}) > (${cursor.createdAt}, ${cursor.id})`
        );
      }
    }

    // Execute query
    let result: File[];
    if (isForward) {
      result = await this.db
        .select()
        .from(files)
        .where(and(...conditions))
        .orderBy(desc(files.createdAt), desc(files.id))
        .limit(limit + 1); // Fetch one extra to check hasNextPage
    } else {
      result = await this.db
        .select()
        .from(files)
        .where(and(...conditions))
        .orderBy(asc(files.createdAt), asc(files.id))
        .limit(limit + 1);

      // Reverse the result to maintain consistent order
      result = result.reverse();
    }

    // Determine if there are more pages
    const hasExtraItem = result.length > limit;
    if (hasExtraItem) {
      if (isForward) {
        result = result.slice(0, limit);
      } else {
        result = result.slice(1);
      }
    }

    // Build edges
    const edges: FileEdge[] = result.map((file) => ({
      node: file,
      cursor: encodeCursor(file.id, file.createdAt),
    }));

    // Determine page info
    const hasNextPage = isForward ? hasExtraItem : !!before;
    const hasPreviousPage = isForward ? !!after : hasExtraItem;
    const startCursor = edges.length > 0 ? edges[0].cursor : null;
    const endCursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage,
        startCursor,
        endCursor,
      },
      totalCount,
    };
  }

  // ---- Write methods ----

  /**
   * Create a new file
   */
  async create(projectId: string, data: CreateFileInput): Promise<File> {
    const id = data.id ?? crypto.randomUUID();

    const newFile: NewFile = {
      id,
      projectId,
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
  async update(projectId: string, fileId: string, data: UpdateFileInput): Promise<File | null> {
    const updateData: Partial<NewFile> = {
      updatedAt: new Date(),
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
          eq(files.projectId, projectId),
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
  async softDelete(projectId: string, fileId: string): Promise<void> {
    await this.db
      .update(files)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(files.projectId, projectId),
          eq(files.id, fileId),
          isNull(files.deletedAt)
        )
      );
  }

  /**
   * Hard delete a file (permanent removal)
   */
  async hardDelete(projectId: string, fileId: string): Promise<void> {
    await this.db
      .delete(files)
      .where(
        and(
          eq(files.projectId, projectId),
          eq(files.id, fileId)
        )
      );
  }

  // ---- Utility methods ----

  /**
   * Find a file by idempotency key
   */
  async findByIdempotencyKey(projectId: string, key: string): Promise<File | null> {
    const result = await this.db
      .select()
      .from(files)
      .where(
        and(
          eq(files.projectId, projectId),
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
  async exists(projectId: string, fileId: string): Promise<boolean> {
    const result = await this.db
      .select({ id: files.id })
      .from(files)
      .where(
        and(
          eq(files.projectId, projectId),
          eq(files.id, fileId),
          isNull(files.deletedAt)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Find a file by source URL (for deduplication of URL uploads)
   */
  async findBySourceUrl(projectId: string, sourceUrl: string): Promise<File | null> {
    const result = await this.db
      .select()
      .from(files)
      .where(
        and(
          eq(files.projectId, projectId),
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
  async findDeletedById(projectId: string, fileId: string): Promise<File | null> {
    const result = await this.db
      .select()
      .from(files)
      .where(
        and(
          eq(files.projectId, projectId),
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
  async restore(projectId: string, fileId: string): Promise<File | null> {
    const result = await this.db
      .update(files)
      .set({
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(files.projectId, projectId),
          eq(files.id, fileId),
          sql`${files.deletedAt} IS NOT NULL`
        )
      )
      .returning();

    return result[0] ?? null;
  }
}
