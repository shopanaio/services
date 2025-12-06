import { eq, and, inArray, asc } from "drizzle-orm";
import { BaseRepository } from "./BaseRepository.js";
import {
  variantMedia,
  type VariantMedia,
  type NewVariantMedia,
} from "./models";

export class MediaRepository extends BaseRepository {

  // ─────────────────────────────────────────────────────────────────────────
  // Variant Media
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get all media for a variant, ordered by sortIndex
   */
  async getVariantMedia(variantId: string): Promise<VariantMedia[]> {
    return this.connection
      .select()
      .from(variantMedia)
      .where(
        and(
          eq(variantMedia.projectId, this.projectId),
          eq(variantMedia.variantId, variantId)
        )
      )
      .orderBy(asc(variantMedia.sortIndex));
  }

  /**
   * Get media for multiple variants (batch)
   */
  async getVariantMediaBatch(
    variantIds: string[]
  ): Promise<Map<string, VariantMedia[]>> {
    if (variantIds.length === 0) return new Map();

    const results = await this.connection
      .select()
      .from(variantMedia)
      .where(
        and(
          eq(variantMedia.projectId, this.projectId),
          inArray(variantMedia.variantId, variantIds)
        )
      )
      .orderBy(asc(variantMedia.sortIndex));

    const map = new Map<string, VariantMedia[]>();
    for (const row of results) {
      const existing = map.get(row.variantId) ?? [];
      existing.push(row);
      map.set(row.variantId, existing);
    }
    return map;
  }

  /**
   * Add media to variant
   */
  async addVariantMedia(
    variantId: string,
    fileId: string,
    sortIndex: number
  ): Promise<VariantMedia> {
    const data: NewVariantMedia = {
      projectId: this.projectId,
      variantId,
      fileId,
      sortIndex,
    };

    const result = await this.connection
      .insert(variantMedia)
      .values(data)
      .onConflictDoUpdate({
        target: [variantMedia.variantId, variantMedia.fileId],
        set: { sortIndex },
      })
      .returning();

    return result[0];
  }

  /**
   * Set all media for a variant (replaces existing)
   */
  async setVariantMedia(
    variantId: string,
    fileIds: string[]
  ): Promise<VariantMedia[]> {
    // Delete existing
    await this.connection
      .delete(variantMedia)
      .where(
        and(
          eq(variantMedia.projectId, this.projectId),
          eq(variantMedia.variantId, variantId)
        )
      );

    if (fileIds.length === 0) return [];

    // Insert new with sort order
    const values: NewVariantMedia[] = fileIds.map((fileId, index) => ({
      projectId: this.projectId,
      variantId,
      fileId,
      sortIndex: index,
    }));

    return this.connection.insert(variantMedia).values(values).returning();
  }

  /**
   * Remove specific media from variant
   */
  async removeVariantMedia(variantId: string, fileId: string): Promise<void> {
    await this.connection
      .delete(variantMedia)
      .where(
        and(
          eq(variantMedia.projectId, this.projectId),
          eq(variantMedia.variantId, variantId),
          eq(variantMedia.fileId, fileId)
        )
      );
  }

  /**
   * Remove all media from variant
   */
  async removeAllVariantMedia(variantId: string): Promise<void> {
    await this.connection
      .delete(variantMedia)
      .where(
        and(
          eq(variantMedia.projectId, this.projectId),
          eq(variantMedia.variantId, variantId)
        )
      );
  }

  /**
   * Reorder media for variant
   */
  async reorderVariantMedia(
    variantId: string,
    fileIds: string[]
  ): Promise<void> {
    // Update sort indices based on new order
    for (let i = 0; i < fileIds.length; i++) {
      await this.connection
        .update(variantMedia)
        .set({ sortIndex: i })
        .where(
          and(
            eq(variantMedia.projectId, this.projectId),
            eq(variantMedia.variantId, variantId),
            eq(variantMedia.fileId, fileIds[i])
          )
        );
    }
  }

  /**
   * Find all variants using a specific file
   * Useful for Media service callbacks (e.g., file deleted)
   */
  async findVariantsByFileId(fileId: string): Promise<string[]> {
    const results = await this.connection
      .select({ variantId: variantMedia.variantId })
      .from(variantMedia)
      .where(eq(variantMedia.fileId, fileId));

    return results.map((r) => r.variantId);
  }
}
