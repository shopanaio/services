import { eq, and, inArray, asc } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  variantMedia,
  type VariantMedia,
  type NewVariantMedia,
} from "../models";

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
          eq(variantMedia.projectId, this.storeId),
          eq(variantMedia.variantId, variantId)
        )
      )
      .orderBy(asc(variantMedia.sortIndex));
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
      projectId: this.storeId,
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
          eq(variantMedia.projectId, this.storeId),
          eq(variantMedia.variantId, variantId)
        )
      );

    if (fileIds.length === 0) return [];

    // Insert new with sort order
    const values: NewVariantMedia[] = fileIds.map((fileId, index) => ({
      projectId: this.storeId,
      variantId,
      fileId,
      sortIndex: index,
    }));

    return this.connection.insert(variantMedia).values(values).returning();
  }

  /**
   * Remove all variant media references for a file (hard delete cleanup)
   */
  async removeByFileId(fileId: string): Promise<number> {
    const result = await this.connection
      .delete(variantMedia)
      .where(eq(variantMedia.fileId, fileId))
      .returning({ fileId: variantMedia.fileId });

    return result.length;
  }
}
