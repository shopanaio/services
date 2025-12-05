import { eq, and, inArray } from "drizzle-orm";
import type { Database } from "../infrastructure/db/database";
import { externalMedia, type ExternalMedia, type NewExternalMedia } from "./models";

// ---- Types ----

export interface CreateExternalMediaInput {
  fileId: string;
  externalId: string;
  providerMeta?: Record<string, unknown> | null;
}

export interface UpdateExternalMediaInput {
  externalId?: string;
  providerMeta?: Record<string, unknown> | null;
}

// ---- Repository ----

export class ExternalMediaRepository {
  constructor(private readonly db: Database) {}

  /**
   * Find external media data by file ID
   */
  async findByFileId(projectId: string, fileId: string): Promise<ExternalMedia | null> {
    const result = await this.db
      .select()
      .from(externalMedia)
      .where(
        and(
          eq(externalMedia.projectId, projectId),
          eq(externalMedia.fileId, fileId)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Find external media by multiple file IDs (batch load for DataLoader)
   */
  async findByFileIds(projectId: string, fileIds: string[]): Promise<Map<string, ExternalMedia>> {
    if (fileIds.length === 0) {
      return new Map();
    }

    const result = await this.db
      .select()
      .from(externalMedia)
      .where(
        and(
          eq(externalMedia.projectId, projectId),
          inArray(externalMedia.fileId, fileIds)
        )
      );

    const map = new Map<string, ExternalMedia>();
    for (const obj of result) {
      map.set(obj.fileId, obj);
    }

    return map;
  }

  /**
   * Create a new external media record
   */
  async create(projectId: string, data: CreateExternalMediaInput): Promise<ExternalMedia> {
    const newExternalMedia: NewExternalMedia = {
      fileId: data.fileId,
      projectId,
      externalId: data.externalId,
      providerMeta: data.providerMeta ?? null,
    };

    const result = await this.db.insert(externalMedia).values(newExternalMedia).returning();

    return result[0];
  }

  /**
   * Update an existing external media record
   */
  async update(projectId: string, fileId: string, data: UpdateExternalMediaInput): Promise<ExternalMedia | null> {
    const updateData: Partial<NewExternalMedia> = {};

    if (data.externalId !== undefined) {
      updateData.externalId = data.externalId;
    }
    if (data.providerMeta !== undefined) {
      updateData.providerMeta = data.providerMeta;
    }

    if (Object.keys(updateData).length === 0) {
      return this.findByFileId(projectId, fileId);
    }

    const result = await this.db
      .update(externalMedia)
      .set(updateData)
      .where(
        and(
          eq(externalMedia.projectId, projectId),
          eq(externalMedia.fileId, fileId)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  /**
   * Delete an external media record
   */
  async delete(projectId: string, fileId: string): Promise<void> {
    await this.db
      .delete(externalMedia)
      .where(
        and(
          eq(externalMedia.projectId, projectId),
          eq(externalMedia.fileId, fileId)
        )
      );
  }

  /**
   * Find external media by external ID (e.g., YouTube video ID)
   * Note: provider is stored in the files table, so we need to join or filter separately
   */
  async findByExternalId(projectId: string, externalId: string): Promise<ExternalMedia | null> {
    const result = await this.db
      .select()
      .from(externalMedia)
      .where(
        and(
          eq(externalMedia.projectId, projectId),
          eq(externalMedia.externalId, externalId)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Check if an external media record exists
   */
  async exists(projectId: string, fileId: string): Promise<boolean> {
    const result = await this.db
      .select({ fileId: externalMedia.fileId })
      .from(externalMedia)
      .where(
        and(
          eq(externalMedia.projectId, projectId),
          eq(externalMedia.fileId, fileId)
        )
      )
      .limit(1);

    return result.length > 0;
  }
}
