import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Database } from "../infrastructure/db/database";
import { fileBackRefs, files, type FileBackRef } from "./models";

export interface FileBackRefEntityRef {
  service: string;
  entityType: string;
  entityId: string;
}

export interface FileBackRefKey extends FileBackRefEntityRef {
  fileId: string;
  role: string;
}

export interface FileBackRefItem {
  fileId: string;
  role: string;
}

export interface FileUsageCount {
  entityType: string;
  count: number;
}

export interface LinkResult {
  inserted: boolean;
}

export interface LinkManyResult {
  linkedCount: number;
}

export class FileBackRefRepository {
  constructor(private readonly db: Database) {}

  /**
   * Link a file to an entity. Only links if file exists and is not soft-deleted.
   */
  async link(params: FileBackRefKey): Promise<LinkResult> {
    const { fileId, service, entityType, entityId, role } = params;

    // Check if file exists and is active
    const file = await this.db
      .select({ id: files.id })
      .from(files)
      .where(and(eq(files.id, fileId), isNull(files.deletedAt)))
      .limit(1);

    if (file.length === 0) {
      return { inserted: false };
    }

    // Insert with conflict handling
    const result = await this.db
      .insert(fileBackRefs)
      .values({
        fileId,
        service,
        entityType,
        entityId,
        role,
      })
      .onConflictDoNothing()
      .returning({ fileId: fileBackRefs.fileId });

    return { inserted: result.length > 0 };
  }

  /**
   * Link multiple files to an entity. Only links files that exist and are not soft-deleted.
   */
  async linkMany(params: {
    items: FileBackRefItem[];
    service: string;
    entityType: string;
    entityId: string;
  }): Promise<LinkManyResult> {
    const { items, service, entityType, entityId } = params;

    if (items.length === 0) {
      return { linkedCount: 0 };
    }

    // Deduplicate by fileId+role
    const uniqueItems = Array.from(
      new Map(items.map((item) => [`${item.fileId}:${item.role}`, item])).values()
    );

    // Get active file IDs
    const fileIds = uniqueItems.map((item) => item.fileId);
    const activeFiles = await this.db
      .select({ id: files.id })
      .from(files)
      .where(and(inArray(files.id, fileIds), isNull(files.deletedAt)));

    const activeIds = new Set(activeFiles.map((f) => f.id));
    const activeItems = uniqueItems.filter((item) => activeIds.has(item.fileId));

    if (activeItems.length === 0) {
      return { linkedCount: 0 };
    }

    // Insert all active items
    const values = activeItems.map((item) => ({
      fileId: item.fileId,
      service,
      entityType,
      entityId,
      role: item.role,
    }));

    const result = await this.db
      .insert(fileBackRefs)
      .values(values)
      .onConflictDoNothing()
      .returning({ fileId: fileBackRefs.fileId });

    return { linkedCount: result.length };
  }

  /**
   * Unlink a file from an entity.
   */
  async unlink(params: FileBackRefKey): Promise<void> {
    const { fileId, service, entityType, entityId, role } = params;

    await this.db
      .delete(fileBackRefs)
      .where(
        and(
          eq(fileBackRefs.fileId, fileId),
          eq(fileBackRefs.service, service),
          eq(fileBackRefs.entityType, entityType),
          eq(fileBackRefs.entityId, entityId),
          eq(fileBackRefs.role, role)
        )
      );
  }

  /**
   * Unlink all files from an entity.
   */
  async unlinkAllByEntity(params: FileBackRefEntityRef): Promise<number> {
    const { service, entityType, entityId } = params;

    const result = await this.db
      .delete(fileBackRefs)
      .where(
        and(
          eq(fileBackRefs.service, service),
          eq(fileBackRefs.entityType, entityType),
          eq(fileBackRefs.entityId, entityId)
        )
      )
      .returning({ fileId: fileBackRefs.fileId });

    return result.length;
  }

  /**
   * Unlink multiple specific file+role combinations from an entity.
   */
  async unlinkMany(params: {
    items: FileBackRefItem[];
    service: string;
    entityType: string;
    entityId: string;
  }): Promise<number> {
    const { items, service, entityType, entityId } = params;

    if (items.length === 0) {
      return 0;
    }

    // Deduplicate by fileId+role
    const uniqueItems = Array.from(
      new Map(items.map((item) => [`${item.fileId}:${item.role}`, item])).values()
    );

    // Delete each item individually and count successes
    let deletedCount = 0;
    for (const item of uniqueItems) {
      const result = await this.db
        .delete(fileBackRefs)
        .where(
          and(
            eq(fileBackRefs.fileId, item.fileId),
            eq(fileBackRefs.service, service),
            eq(fileBackRefs.entityType, entityType),
            eq(fileBackRefs.entityId, entityId),
            eq(fileBackRefs.role, item.role)
          )
        )
        .returning({ fileId: fileBackRefs.fileId });

      deletedCount += result.length;
    }

    return deletedCount;
  }

  /**
   * Count back references for a single file.
   */
  async countByFileId(fileId: string): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(fileBackRefs)
      .where(eq(fileBackRefs.fileId, fileId));

    return result[0]?.count ?? 0;
  }

  /**
   * Count back references for multiple files.
   */
  async countByFileIds(fileIds: string[]): Promise<Map<string, number>> {
    if (fileIds.length === 0) {
      return new Map();
    }

    const result = await this.db
      .select({
        fileId: fileBackRefs.fileId,
        count: count(),
      })
      .from(fileBackRefs)
      .where(inArray(fileBackRefs.fileId, fileIds))
      .groupBy(fileBackRefs.fileId);

    const map = new Map<string, number>();
    for (const row of result) {
      map.set(row.fileId, row.count);
    }

    return map;
  }

  /**
   * Find back references for a file.
   */
  async findByFileId(fileId: string, limit = 100): Promise<FileBackRef[]> {
    return this.db
      .select()
      .from(fileBackRefs)
      .where(eq(fileBackRefs.fileId, fileId))
      .orderBy(desc(fileBackRefs.createdAt), asc(fileBackRefs.entityId))
      .limit(limit);
  }

  /**
   * Get usage counts by entity type for a single file.
   */
  async getUsageByFileId(fileId: string): Promise<FileUsageCount[]> {
    const result = await this.db
      .select({
        entityType: fileBackRefs.entityType,
        count: sql<number>`count(distinct ${fileBackRefs.entityId})::int`,
      })
      .from(fileBackRefs)
      .where(eq(fileBackRefs.fileId, fileId))
      .groupBy(fileBackRefs.entityType);

    return result.map((row) => ({
      entityType: row.entityType,
      count: row.count ?? 0,
    }));
  }

  /**
   * Get usage counts by entity type for multiple files.
   */
  async getUsageByFileIds(fileIds: string[]): Promise<Map<string, FileUsageCount[]>> {
    if (fileIds.length === 0) {
      return new Map();
    }

    const result = await this.db
      .select({
        fileId: fileBackRefs.fileId,
        entityType: fileBackRefs.entityType,
        count: sql<number>`count(distinct ${fileBackRefs.entityId})::int`,
      })
      .from(fileBackRefs)
      .where(inArray(fileBackRefs.fileId, fileIds))
      .groupBy(fileBackRefs.fileId, fileBackRefs.entityType);

    const map = new Map<string, FileUsageCount[]>();
    for (const row of result) {
      const existing = map.get(row.fileId) ?? [];
      existing.push({ entityType: row.entityType, count: row.count ?? 0 });
      map.set(row.fileId, existing);
    }

    return map;
  }
}
