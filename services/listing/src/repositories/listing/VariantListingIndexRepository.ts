import { and, count, eq, inArray, sql } from "drizzle-orm";
import { ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  variantListingIndex,
  type NewVariantListingIndex,
  type VariantListingIndex,
} from "../models/index.js";
import {
  assertNonNegativeInteger,
  assertPositiveDocId,
  assertUniqueBy,
  chunkArray,
  nowIso,
  type VariantListingIndexPatchInput,
  type VariantListingIndexUpsertInput,
} from "./listingRepositoryTypes.js";

export class VariantListingIndexRepository extends BaseRepository {
  @ReadOnly()
  async exists(variantId: string): Promise<boolean> {
    const rows = await this.connection
      .select({ variantId: variantListingIndex.variantId })
      .from(variantListingIndex)
      .where(
        and(
          eq(variantListingIndex.storeId, this.storeId),
          eq(variantListingIndex.variantId, variantId),
        ),
      )
      .limit(1);

    return rows.length > 0;
  }

  @ReadOnly()
  async existsByDocId(variantDocId: number): Promise<boolean> {
    assertPositiveDocId(variantDocId, "variantDocId");
    const rows = await this.connection
      .select({ variantDocId: variantListingIndex.variantDocId })
      .from(variantListingIndex)
      .where(
        and(
          eq(variantListingIndex.storeId, this.storeId),
          eq(variantListingIndex.variantDocId, variantDocId),
        ),
      )
      .limit(1);

    return rows.length > 0;
  }

  @ReadOnly()
  async findByVariantId(variantId: string): Promise<VariantListingIndex | null> {
    const rows = await this.connection
      .select()
      .from(variantListingIndex)
      .where(
        and(
          eq(variantListingIndex.storeId, this.storeId),
          eq(variantListingIndex.variantId, variantId),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  @ReadOnly()
  async findByVariantDocId(variantDocId: number): Promise<VariantListingIndex | null> {
    assertPositiveDocId(variantDocId, "variantDocId");
    const rows = await this.connection
      .select()
      .from(variantListingIndex)
      .where(
        and(
          eq(variantListingIndex.storeId, this.storeId),
          eq(variantListingIndex.variantDocId, variantDocId),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByVariantIds(variantIds: readonly string[]): Promise<VariantListingIndex[]> {
    if (variantIds.length === 0) {
      return [];
    }

    return this.connection
      .select()
      .from(variantListingIndex)
      .where(
        and(
          eq(variantListingIndex.storeId, this.storeId),
          inArray(variantListingIndex.variantId, [...new Set(variantIds)]),
        ),
      );
  }

  @ReadOnly()
  async getByVariantDocIds(variantDocIds: readonly number[]): Promise<VariantListingIndex[]> {
    if (variantDocIds.length === 0) {
      return [];
    }

    for (const variantDocId of variantDocIds) {
      assertPositiveDocId(variantDocId, "variantDocId");
    }

    return this.connection
      .select()
      .from(variantListingIndex)
      .where(
        and(
          eq(variantListingIndex.storeId, this.storeId),
          inArray(variantListingIndex.variantDocId, [...new Set(variantDocIds)]),
        ),
      );
  }

  @ReadOnly()
  async getByProductIds(productIds: readonly string[]): Promise<VariantListingIndex[]> {
    if (productIds.length === 0) {
      return [];
    }

    return this.connection
      .select()
      .from(variantListingIndex)
      .where(
        and(
          eq(variantListingIndex.storeId, this.storeId),
          inArray(variantListingIndex.productId, [...new Set(productIds)]),
        ),
      );
  }

  @ReadOnly()
  async getByProductDocIds(productDocIds: readonly number[]): Promise<VariantListingIndex[]> {
    if (productDocIds.length === 0) {
      return [];
    }

    for (const productDocId of productDocIds) {
      assertPositiveDocId(productDocId, "productDocId");
    }

    return this.connection
      .select()
      .from(variantListingIndex)
      .where(
        and(
          eq(variantListingIndex.storeId, this.storeId),
          inArray(variantListingIndex.productDocId, [...new Set(productDocIds)]),
        ),
      );
  }

  @ReadOnly()
  async count(): Promise<number> {
    const rows = await this.connection
      .select({ value: count() })
      .from(variantListingIndex)
      .where(eq(variantListingIndex.storeId, this.storeId));

    return rows[0]?.value ?? 0;
  }

  async upsert(row: VariantListingIndexUpsertInput): Promise<VariantListingIndex> {
    const rows = await this.upsertMany([row]);
    return rows[0];
  }

  async upsertMany(
    rows: readonly VariantListingIndexUpsertInput[],
  ): Promise<VariantListingIndex[]> {
    if (rows.length === 0) {
      return [];
    }

    assertUniqueBy(rows, (row) => row.variantId, "variant listing row");
    const now = nowIso();
    const result: VariantListingIndex[] = [];

    for (const chunk of chunkArray(rows)) {
      const values = chunk.map((row) => this.toInsertRow(row, now));
      const inserted = await this.connection
        .insert(variantListingIndex)
        .values(values)
        .onConflictDoUpdate({
          target: variantListingIndex.variantId,
          setWhere: eq(variantListingIndex.storeId, this.storeId),
          set: {
            productId: sql`excluded.product_id`,
            productDocId: sql`excluded.product_doc_id`,
            totalStock: sql`excluded.total_stock`,
            indexedAt: now,
            updatedAt: now,
          },
        })
        .returning();

      result.push(...inserted);
    }

    return result;
  }

  async update(
    variantId: string,
    patch: VariantListingIndexPatchInput,
  ): Promise<VariantListingIndex | null> {
    const rows = await this.connection
      .update(variantListingIndex)
      .set(this.toPatchRow(patch))
      .where(
        and(
          eq(variantListingIndex.storeId, this.storeId),
          eq(variantListingIndex.variantId, variantId),
        ),
      )
      .returning();

    return rows[0] ?? null;
  }

  async delete(variantId: string): Promise<boolean> {
    const rows = await this.connection
      .delete(variantListingIndex)
      .where(
        and(
          eq(variantListingIndex.storeId, this.storeId),
          eq(variantListingIndex.variantId, variantId),
        ),
      )
      .returning({ variantId: variantListingIndex.variantId });

    return rows.length > 0;
  }

  async deleteByVariantIds(variantIds: readonly string[]): Promise<number> {
    if (variantIds.length === 0) {
      return 0;
    }

    let deleted = 0;
    for (const chunk of chunkArray([...new Set(variantIds)])) {
      const rows = await this.connection
        .delete(variantListingIndex)
        .where(
          and(
            eq(variantListingIndex.storeId, this.storeId),
            inArray(variantListingIndex.variantId, chunk),
          ),
        )
        .returning({ variantId: variantListingIndex.variantId });

      deleted += rows.length;
    }

    return deleted;
  }

  async deleteByProductId(productId: string): Promise<number> {
    const rows = await this.connection
      .delete(variantListingIndex)
      .where(
        and(
          eq(variantListingIndex.storeId, this.storeId),
          eq(variantListingIndex.productId, productId),
        ),
      )
      .returning({ variantId: variantListingIndex.variantId });

    return rows.length;
  }

  async deleteByProductIds(productIds: readonly string[]): Promise<number> {
    if (productIds.length === 0) {
      return 0;
    }

    let deleted = 0;
    for (const chunk of chunkArray([...new Set(productIds)])) {
      const rows = await this.connection
        .delete(variantListingIndex)
        .where(
          and(
            eq(variantListingIndex.storeId, this.storeId),
            inArray(variantListingIndex.productId, chunk),
          ),
        )
        .returning({ variantId: variantListingIndex.variantId });

      deleted += rows.length;
    }

    return deleted;
  }

  @ReadOnly()
  async getActiveVariantIdsByProductIds(
    productIds: readonly string[],
  ): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    for (const productId of productIds) {
      result.set(productId, []);
    }

    if (productIds.length === 0) {
      return result;
    }

    const rows = await this.connection
      .select({
        productId: variantListingIndex.productId,
        variantId: variantListingIndex.variantId,
      })
      .from(variantListingIndex)
      .where(
        and(
          eq(variantListingIndex.storeId, this.storeId),
          inArray(variantListingIndex.productId, [...new Set(productIds)]),
        ),
      );

    for (const row of rows) {
      const variantIds = result.get(row.productId) ?? [];
      variantIds.push(row.variantId);
      result.set(row.productId, variantIds);
    }

    return result;
  }

  private toInsertRow(row: VariantListingIndexUpsertInput, now: string): NewVariantListingIndex {
    assertPositiveDocId(row.productDocId, "productDocId");
    assertPositiveDocId(row.variantDocId, "variantDocId");
    assertNonNegativeInteger(row.totalStock, "totalStock");
    return {
      storeId: this.storeId,
      productId: row.productId,
      productDocId: row.productDocId,
      variantId: row.variantId,
      variantDocId: row.variantDocId,
      totalStock: row.totalStock,
      indexedAt: now,
      updatedAt: now,
    };
  }

  private toPatchRow(patch: VariantListingIndexPatchInput): Partial<NewVariantListingIndex> {
    const updateData: Partial<NewVariantListingIndex> = {
      updatedAt: nowIso(),
    };

    if (patch.productId !== undefined) updateData.productId = patch.productId;
    if (patch.productDocId !== undefined) {
      assertPositiveDocId(patch.productDocId, "productDocId");
      updateData.productDocId = patch.productDocId;
    }
    if (patch.totalStock !== undefined) {
      assertNonNegativeInteger(patch.totalStock, "totalStock");
      updateData.totalStock = patch.totalStock;
    }

    return updateData;
  }
}
