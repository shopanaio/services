import { and, eq, inArray } from "drizzle-orm";
import { Transactional, ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  listingDocIdAllocator,
  productListingIndex,
  variantListingIndex,
  type ListingDocIdAllocator,
} from "../models/index.js";
import {
  assertNonNegativeInteger,
  nowIso,
  uniqueValues,
} from "./listingRepositoryTypes.js";

export class ListingDocIdAllocatorRepository extends BaseRepository {
  @ReadOnly()
  async exists(): Promise<boolean> {
    const rows = await this.connection
      .select({ storeId: listingDocIdAllocator.storeId })
      .from(listingDocIdAllocator)
      .where(eq(listingDocIdAllocator.storeId, this.storeId))
      .limit(1);

    return rows.length > 0;
  }

  @ReadOnly()
  async find(): Promise<ListingDocIdAllocator | null> {
    const rows = await this.connection
      .select()
      .from(listingDocIdAllocator)
      .where(eq(listingDocIdAllocator.storeId, this.storeId))
      .limit(1);

    return rows[0] ?? null;
  }

  async ensureAllocatorRow(): Promise<ListingDocIdAllocator> {
    const now = nowIso();
    const inserted = await this.connection
      .insert(listingDocIdAllocator)
      .values({
        storeId: this.storeId,
        nextProductDocId: 1,
        nextVariantDocId: 1,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: listingDocIdAllocator.storeId })
      .returning();

    if (inserted[0]) {
      return inserted[0];
    }

    const existing = await this.find();
    if (!existing) {
      throw new Error("Failed to ensure listing doc id allocator row");
    }
    return existing;
  }

  async lockAllocatorRow(): Promise<ListingDocIdAllocator> {
    await this.ensureAllocatorRow();

    const rows = await this.connection
      .select()
      .from(listingDocIdAllocator)
      .where(eq(listingDocIdAllocator.storeId, this.storeId))
      .limit(1)
      .for("update");

    const row = rows[0];
    if (!row) {
      throw new Error("Failed to lock listing doc id allocator row");
    }
    return row;
  }

  @ReadOnly()
  async getExistingProductDocIds(
    productIds: readonly string[]
  ): Promise<Map<string, number>> {
    const uniqueProductIds = uniqueValues(productIds);
    if (uniqueProductIds.length === 0) {
      return new Map();
    }

    const rows = await this.connection
      .select({
        productId: productListingIndex.productId,
        productDocId: productListingIndex.productDocId,
      })
      .from(productListingIndex)
      .where(
        and(
          eq(productListingIndex.storeId, this.storeId),
          inArray(productListingIndex.productId, uniqueProductIds)
        )
      );

    return new Map(rows.map((row) => [row.productId, row.productDocId]));
  }

  @ReadOnly()
  async getExistingVariantDocIds(
    variantIds: readonly string[]
  ): Promise<Map<string, number>> {
    const uniqueVariantIds = uniqueValues(variantIds);
    if (uniqueVariantIds.length === 0) {
      return new Map();
    }

    const rows = await this.connection
      .select({
        variantId: variantListingIndex.variantId,
        variantDocId: variantListingIndex.variantDocId,
      })
      .from(variantListingIndex)
      .where(
        and(
          eq(variantListingIndex.storeId, this.storeId),
          inArray(variantListingIndex.variantId, uniqueVariantIds)
        )
      );

    return new Map(rows.map((row) => [row.variantId, row.variantDocId]));
  }

  @Transactional()
  async allocateProductDocIds(
    productIds: readonly string[]
  ): Promise<Map<string, number>> {
    const uniqueProductIds = uniqueValues(productIds);
    if (uniqueProductIds.length === 0) {
      return new Map();
    }

    const result = await this.getExistingProductDocIds(uniqueProductIds);
    const missingProductIds = uniqueProductIds.filter(
      (productId) => !result.has(productId)
    );

    if (missingProductIds.length === 0) {
      return result;
    }

    const allocator = await this.lockAllocatorRow();
    const existingAfterLock = await this.getExistingProductDocIds(
      missingProductIds
    );
    for (const [productId, productDocId] of existingAfterLock) {
      result.set(productId, productDocId);
    }

    const stillMissingProductIds = missingProductIds.filter(
      (productId) => !result.has(productId)
    );
    if (stillMissingProductIds.length === 0) {
      return result;
    }

    let nextProductDocId = allocator.nextProductDocId;

    for (const productId of stillMissingProductIds) {
      result.set(productId, nextProductDocId);
      nextProductDocId += 1;
    }

    await this.updateCounters({ nextProductDocId });
    return result;
  }

  @Transactional()
  async allocateVariantDocIds(
    variantIds: readonly string[]
  ): Promise<Map<string, number>> {
    const uniqueVariantIds = uniqueValues(variantIds);
    if (uniqueVariantIds.length === 0) {
      return new Map();
    }

    const result = await this.getExistingVariantDocIds(uniqueVariantIds);
    const missingVariantIds = uniqueVariantIds.filter(
      (variantId) => !result.has(variantId)
    );

    if (missingVariantIds.length === 0) {
      return result;
    }

    const allocator = await this.lockAllocatorRow();
    const existingAfterLock = await this.getExistingVariantDocIds(
      missingVariantIds
    );
    for (const [variantId, variantDocId] of existingAfterLock) {
      result.set(variantId, variantDocId);
    }

    const stillMissingVariantIds = missingVariantIds.filter(
      (variantId) => !result.has(variantId)
    );
    if (stillMissingVariantIds.length === 0) {
      return result;
    }

    let nextVariantDocId = allocator.nextVariantDocId;

    for (const variantId of stillMissingVariantIds) {
      result.set(variantId, nextVariantDocId);
      nextVariantDocId += 1;
    }

    await this.updateCounters({ nextVariantDocId });
    return result;
  }

  async updateCounters(input: {
    nextProductDocId?: number;
    nextVariantDocId?: number;
  }): Promise<ListingDocIdAllocator> {
    if (input.nextProductDocId !== undefined) {
      assertNonNegativeInteger(input.nextProductDocId - 1, "nextProductDocId");
    }
    if (input.nextVariantDocId !== undefined) {
      assertNonNegativeInteger(input.nextVariantDocId - 1, "nextVariantDocId");
    }

    const updateData: Partial<typeof listingDocIdAllocator.$inferInsert> = {
      updatedAt: nowIso(),
    };

    if (input.nextProductDocId !== undefined) {
      updateData.nextProductDocId = input.nextProductDocId;
    }
    if (input.nextVariantDocId !== undefined) {
      updateData.nextVariantDocId = input.nextVariantDocId;
    }

    const rows = await this.connection
      .update(listingDocIdAllocator)
      .set(updateData)
      .where(eq(listingDocIdAllocator.storeId, this.storeId))
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error("Listing doc id allocator row does not exist");
    }
    return row;
  }
}
