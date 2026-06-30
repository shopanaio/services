import { randomUUID } from "crypto";
import { eq, and, inArray, asc, isNull } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  productMedia,
  variant,
  variantMedia,
  type ProductMedia,
  type NewProductMedia,
  type NewVariantMedia,
  type Variant,
  type VariantMedia,
} from "../models";

export interface VariantMediaWithFile extends VariantMedia {
  fileId: string;
  productMediaSortIndex: number;
}

export class ProductMediaRegistrationError extends Error {
  constructor(readonly missingFileIds: string[]) {
    super("Variant media contains files that are not registered on the product");
    this.name = "ProductMediaRegistrationError";
  }
}

export class MediaRepository extends BaseRepository {
  // ─────────────────────────────────────────────────────────────────────────
  // Product Media
  // ─────────────────────────────────────────────────────────────────────────

  async getProductMedia(productId: string): Promise<ProductMedia[]> {
    return this.connection
      .select()
      .from(productMedia)
      .where(
        and(
          eq(productMedia.projectId, this.storeId),
          eq(productMedia.productId, productId)
        )
      )
      .orderBy(asc(productMedia.sortIndex));
  }

  async getProductMediaByProductIds(
    productIds: readonly string[]
  ): Promise<ProductMedia[]> {
    if (productIds.length === 0) return [];

    return this.connection
      .select()
      .from(productMedia)
      .where(
        and(
          eq(productMedia.projectId, this.storeId),
          inArray(productMedia.productId, [...productIds])
        )
      )
      .orderBy(asc(productMedia.productId), asc(productMedia.sortIndex));
  }

  async getProductMediaByFileIds(
    productId: string,
    fileIds: readonly string[]
  ): Promise<ProductMedia[]> {
    const uniqueFileIds = this.dedupeFileIds(fileIds);
    if (uniqueFileIds.length === 0) return [];

    return this.connection
      .select()
      .from(productMedia)
      .where(
        and(
          eq(productMedia.projectId, this.storeId),
          eq(productMedia.productId, productId),
          inArray(productMedia.fileId, uniqueFileIds)
        )
      );
  }

  async setProductMedia(
    productId: string,
    fileIds: readonly string[]
  ): Promise<ProductMedia[]> {
    const uniqueFileIds = this.dedupeFileIds(fileIds);
    const existing = await this.getProductMedia(productId);
    const existingByFileId = new Map(
      existing.map((media) => [media.fileId, media])
    );
    const requestedFileIdSet = new Set(uniqueFileIds);

    const removedFileIds = existing
      .filter((media) => !requestedFileIdSet.has(media.fileId))
      .map((media) => media.fileId);

    if (removedFileIds.length > 0) {
      await this.connection
        .delete(productMedia)
        .where(
          and(
            eq(productMedia.projectId, this.storeId),
            eq(productMedia.productId, productId),
            inArray(productMedia.fileId, removedFileIds)
          )
        );
    }

    const inserts: NewProductMedia[] = [];
    for (let sortIndex = 0; sortIndex < uniqueFileIds.length; sortIndex++) {
      const fileId = uniqueFileIds[sortIndex];
      const existingMedia = existingByFileId.get(fileId);

      if (!existingMedia) {
        inserts.push({
          id: randomUUID(),
          projectId: this.storeId,
          productId,
          fileId,
          sortIndex,
        });
        continue;
      }

      if (existingMedia.sortIndex !== sortIndex) {
        await this.connection
          .update(productMedia)
          .set({ sortIndex })
          .where(
            and(
              eq(productMedia.projectId, this.storeId),
              eq(productMedia.id, existingMedia.id)
            )
          );
      }
    }

    if (inserts.length > 0) {
      await this.connection.insert(productMedia).values(inserts);
    }

    return this.getProductMedia(productId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Variant Media
  // ─────────────────────────────────────────────────────────────────────────

  async getVariantMedia(variantId: string): Promise<VariantMediaWithFile[]> {
    return this.connection
      .select({
        projectId: variantMedia.projectId,
        productId: variantMedia.productId,
        variantId: variantMedia.variantId,
        productMediaId: variantMedia.productMediaId,
        sortIndex: variantMedia.sortIndex,
        fileId: productMedia.fileId,
        productMediaSortIndex: productMedia.sortIndex,
      })
      .from(variantMedia)
      .innerJoin(
        productMedia,
        and(
          eq(variantMedia.projectId, productMedia.projectId),
          eq(variantMedia.productId, productMedia.productId),
          eq(variantMedia.productMediaId, productMedia.id)
        )
      )
      .where(
        and(
          eq(variantMedia.projectId, this.storeId),
          eq(variantMedia.variantId, variantId)
        )
      )
      .orderBy(asc(variantMedia.sortIndex));
  }

  async getVariantMediaByVariantIds(
    variantIds: readonly string[]
  ): Promise<VariantMediaWithFile[]> {
    if (variantIds.length === 0) return [];

    return this.connection
      .select({
        projectId: variantMedia.projectId,
        productId: variantMedia.productId,
        variantId: variantMedia.variantId,
        productMediaId: variantMedia.productMediaId,
        sortIndex: variantMedia.sortIndex,
        fileId: productMedia.fileId,
        productMediaSortIndex: productMedia.sortIndex,
      })
      .from(variantMedia)
      .innerJoin(
        productMedia,
        and(
          eq(variantMedia.projectId, productMedia.projectId),
          eq(variantMedia.productId, productMedia.productId),
          eq(variantMedia.productMediaId, productMedia.id)
        )
      )
      .where(
        and(
          eq(variantMedia.projectId, this.storeId),
          inArray(variantMedia.variantId, [...variantIds])
        )
      )
      .orderBy(asc(variantMedia.variantId), asc(variantMedia.sortIndex));
  }

  async setVariantMedia(
    variantId: string,
    fileIds: readonly string[]
  ): Promise<VariantMediaWithFile[]> {
    const targetVariant = await this.getVariantForMediaUpdate(variantId);
    if (!targetVariant) {
      throw new Error("Variant not found");
    }

    const uniqueFileIds = this.dedupeFileIds(fileIds);
    const registeredMedia = await this.getProductMediaByFileIds(
      targetVariant.productId,
      uniqueFileIds
    );
    const productMediaByFileId = new Map(
      registeredMedia.map((media) => [media.fileId, media])
    );
    const missingFileIds = uniqueFileIds.filter(
      (fileId) => !productMediaByFileId.has(fileId)
    );

    if (missingFileIds.length > 0) {
      throw new ProductMediaRegistrationError(missingFileIds);
    }

    await this.clearVariantMedia(variantId);

    if (uniqueFileIds.length === 0) {
      return [];
    }

    const values: NewVariantMedia[] = uniqueFileIds.map((fileId, index) => {
      const media = productMediaByFileId.get(fileId);
      if (!media) {
        throw new ProductMediaRegistrationError([fileId]);
      }

      return {
        projectId: this.storeId,
        productId: targetVariant.productId,
        variantId,
        productMediaId: media.id,
        sortIndex: index,
      };
    });

    await this.connection.insert(variantMedia).values(values);

    return this.getVariantMedia(variantId);
  }

  async clearVariantMedia(variantId: string): Promise<number> {
    const result = await this.connection
      .delete(variantMedia)
      .where(
        and(
          eq(variantMedia.projectId, this.storeId),
          eq(variantMedia.variantId, variantId)
        )
      )
      .returning({ variantId: variantMedia.variantId });

    return result.length;
  }

  async removeProductMediaByFileId(fileId: string): Promise<number> {
    const result = await this.connection
      .delete(productMedia)
      .where(eq(productMedia.fileId, fileId))
      .returning({ fileId: productMedia.fileId });

    return result.length;
  }

  private async getVariantForMediaUpdate(
    variantId: string
  ): Promise<Variant | null> {
    const result = await this.connection
      .select()
      .from(variant)
      .where(
        and(
          eq(variant.projectId, this.storeId),
          eq(variant.id, variantId),
          isNull(variant.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  private dedupeFileIds(fileIds: readonly string[]): string[] {
    return Array.from(new Set(fileIds));
  }
}
