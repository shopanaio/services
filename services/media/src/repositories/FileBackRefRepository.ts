import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { Database } from "../infrastructure/db/database";
import { fileBackRefs, type FileBackRef } from "./models";

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

export class FileBackRefRepository {
  constructor(private readonly db: Database) {}

  async link(params: FileBackRefKey): Promise<void> {
    const { fileId, service, entityType, entityId, role } = params;

    await this.db.execute(sql`
      INSERT INTO media.file_back_refs
        (file_id, service, entity_type, entity_id, role, created_at)
      SELECT ${fileId}, ${service}, ${entityType}, ${entityId}, ${role}, NOW()
      FROM media.files
      WHERE id = ${fileId} AND deleted_at IS NULL
      ON CONFLICT DO NOTHING
    `);
  }

  async linkMany(params: {
    items: FileBackRefItem[];
    service: string;
    entityType: string;
    entityId: string;
  }): Promise<void> {
    const { items, service, entityType, entityId } = params;

    if (items.length === 0) {
      return;
    }

    const values = items.map((item) => sql`(${item.fileId}, ${item.role})`);

    await this.db.execute(sql`
      INSERT INTO media.file_back_refs
        (file_id, service, entity_type, entity_id, role, created_at)
      SELECT v.file_id, ${service}, ${entityType}, ${entityId}, v.role, NOW()
      FROM (VALUES ${sql.join(values, sql`, `)}) AS v(file_id, role)
      INNER JOIN media.files f ON f.id = v.file_id AND f.deleted_at IS NULL
      ON CONFLICT DO NOTHING
    `);
  }

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

    const uniqueItems = Array.from(
      new Map(items.map((item) => [`${item.fileId}:${item.role}`, item])).values()
    );
    const values = uniqueItems.map((item) => sql`(${item.fileId}, ${item.role})`);

    const result = await this.db.execute<{ file_id: string }>(sql`
      DELETE FROM media.file_back_refs f
      USING (VALUES ${sql.join(values, sql`, `)}) AS v(file_id, role)
      WHERE f.service = ${service}
        AND f.entity_type = ${entityType}
        AND f.entity_id = ${entityId}
        AND f.file_id = v.file_id
        AND f.role = v.role
      RETURNING f.file_id
    `);

    return result.length;
  }

  async countByFileId(fileId: string): Promise<number> {
    const result = await this.db.execute<{ count: number }>(sql`
      SELECT COUNT(*)::int AS count
      FROM media.file_back_refs
      WHERE file_id = ${fileId}
    `);

    return result[0]?.count ?? 0;
  }

  async countByFileIds(fileIds: string[]): Promise<Map<string, number>> {
    if (fileIds.length === 0) {
      return new Map();
    }

    const values = fileIds.map((fileId) => sql`${fileId}`);

    const result = await this.db.execute<{ file_id: string; count: number }>(sql`
      SELECT file_id, COUNT(*)::int AS count
      FROM media.file_back_refs
      WHERE file_id IN (${sql.join(values, sql`, `)})
      GROUP BY file_id
    `);

    const map = new Map<string, number>();
    for (const row of result) {
      map.set(row.file_id, row.count ?? 0);
    }

    return map;
  }

  async findByFileId(fileId: string, limit = 100): Promise<FileBackRef[]> {
    return this.db
      .select()
      .from(fileBackRefs)
      .where(eq(fileBackRefs.fileId, fileId))
      .orderBy(desc(fileBackRefs.createdAt), asc(fileBackRefs.entityId))
      .limit(limit);
  }

  async getUsageByFileId(fileId: string): Promise<FileUsageCount[]> {
    const result = await this.db.execute<{ entity_type: string; count: number }>(sql`
      SELECT entity_type, COUNT(DISTINCT entity_id)::int AS count
      FROM media.file_back_refs
      WHERE file_id = ${fileId}
      GROUP BY entity_type
    `);

    return result.map((row) => ({
      entityType: row.entity_type,
      count: row.count ?? 0,
    }));
  }

  async getUsageByFileIds(fileIds: string[]): Promise<Map<string, FileUsageCount[]>> {
    if (fileIds.length === 0) {
      return new Map();
    }

    const values = fileIds.map((fileId) => sql`${fileId}`);

    const result = await this.db.execute<{
      file_id: string;
      entity_type: string;
      count: number;
    }>(sql`
      SELECT file_id, entity_type, COUNT(DISTINCT entity_id)::int AS count
      FROM media.file_back_refs
      WHERE file_id IN (${sql.join(values, sql`, `)})
      GROUP BY file_id, entity_type
    `);

    const map = new Map<string, FileUsageCount[]>();
    for (const row of result) {
      const existing = map.get(row.file_id) ?? [];
      existing.push({ entityType: row.entity_type, count: row.count ?? 0 });
      map.set(row.file_id, existing);
    }

    return map;
  }
}
