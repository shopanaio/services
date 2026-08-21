import { and, count, eq, inArray, sql } from "drizzle-orm";
import { Transactional, ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  productListingIndex,
  type NewProductListingIndex,
  type ProductListingIndex,
} from "../models/index.js";
import {
  assertListingStatus,
  assertNonNegativeInteger,
  assertPositiveDocId,
  assertProductEntityType,
  assertUniqueBy,
  chunkArray,
  nowIso,
  type ProductListingIndexBootstrapInput,
  type ProductListingIndexPatchInput,
  type ProductListingIndexUpsertInput,
} from "./listingRepositoryTypes.js";

export class ProductListingIndexRepository extends BaseRepository {
  @ReadOnly()
  async exists(productId: string): Promise<boolean> {
    const rows = await this.connection
      .select({ productId: productListingIndex.productId })
      .from(productListingIndex)
      .where(
        and(
          eq(productListingIndex.storeId, this.storeId),
          eq(productListingIndex.productId, productId),
        ),
      )
      .limit(1);

    return rows.length > 0;
  }

  @ReadOnly()
  async existsByDocId(productDocId: number): Promise<boolean> {
    assertPositiveDocId(productDocId, "productDocId");
    const rows = await this.connection
      .select({ productDocId: productListingIndex.productDocId })
      .from(productListingIndex)
      .where(
        and(
          eq(productListingIndex.storeId, this.storeId),
          eq(productListingIndex.productDocId, productDocId),
        ),
      )
      .limit(1);

    return rows.length > 0;
  }

  @ReadOnly()
  async findByProductId(productId: string): Promise<ProductListingIndex | null> {
    const rows = await this.connection
      .select()
      .from(productListingIndex)
      .where(
        and(
          eq(productListingIndex.storeId, this.storeId),
          eq(productListingIndex.productId, productId),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  @ReadOnly()
  async findByProductDocId(productDocId: number): Promise<ProductListingIndex | null> {
    assertPositiveDocId(productDocId, "productDocId");
    const rows = await this.connection
      .select()
      .from(productListingIndex)
      .where(
        and(
          eq(productListingIndex.storeId, this.storeId),
          eq(productListingIndex.productDocId, productDocId),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByProductIds(productIds: readonly string[]): Promise<ProductListingIndex[]> {
    if (productIds.length === 0) {
      return [];
    }

    return this.connection
      .select()
      .from(productListingIndex)
      .where(
        and(
          eq(productListingIndex.storeId, this.storeId),
          inArray(productListingIndex.productId, [...new Set(productIds)]),
        ),
      );
  }

  @ReadOnly()
  async getByProductDocIds(productDocIds: readonly number[]): Promise<ProductListingIndex[]> {
    if (productDocIds.length === 0) {
      return [];
    }

    for (const productDocId of productDocIds) {
      assertPositiveDocId(productDocId, "productDocId");
    }

    return this.connection
      .select()
      .from(productListingIndex)
      .where(
        and(
          eq(productListingIndex.storeId, this.storeId),
          inArray(productListingIndex.productDocId, [...new Set(productDocIds)]),
        ),
      );
  }

  @ReadOnly()
  async count(): Promise<number> {
    const rows = await this.connection
      .select({ value: count() })
      .from(productListingIndex)
      .where(eq(productListingIndex.storeId, this.storeId));

    return rows[0]?.value ?? 0;
  }

  @Transactional()
  async createBootstrapRow(input: {
    productId: string;
    productDocId: number;
    productCreatedAt: string;
    productUpdatedAt: string;
  }): Promise<ProductListingIndex> {
    const rows = await this.ensureBootstrapRows([input]);
    const row = rows[0];
    if (!row) {
      throw new Error("Failed to create product listing bootstrap row");
    }
    return row;
  }

  @Transactional()
  async ensureBootstrapRows(
    rows: readonly ProductListingIndexBootstrapInput[],
  ): Promise<ProductListingIndex[]> {
    if (rows.length === 0) {
      return [];
    }

    assertUniqueBy(rows, (row) => row.productId, "product bootstrap row");

    const now = nowIso();
    const insertRows = rows.map((row) => {
      assertPositiveDocId(row.productDocId, "productDocId");
      if (row.entityType !== undefined) {
        assertProductEntityType(row.entityType);
      }

      return {
        storeId: this.storeId,
        productId: row.productId,
        productDocId: row.productDocId,
        entityType: row.entityType ?? "product",
        vendorId: null,
        handle: null,
        status: "draft",
        publishedAt: null,
        productCreatedAt: row.productCreatedAt ?? now,
        productUpdatedAt: row.productUpdatedAt ?? now,
        totalStock: 0,
        indexedAt: now,
        updatedAt: now,
      } satisfies NewProductListingIndex;
    });

    for (const chunk of chunkArray(insertRows)) {
      await this.connection
        .insert(productListingIndex)
        .values(chunk)
        .onConflictDoNothing({ target: productListingIndex.productId });
    }

    const productIds = rows.map((row) => row.productId);
    const existingRows = await this.getByProductIds(productIds);
    const byProductId = new Map(existingRows.map((row) => [row.productId, row]));
    return productIds.map((productId) => {
      const row = byProductId.get(productId);
      if (!row) {
        throw new Error(`Product listing bootstrap row was not found: ${productId}`);
      }
      return row;
    });
  }

  async upsert(input: ProductListingIndexUpsertInput): Promise<ProductListingIndex> {
    const rows = await this.upsertMany([input]);
    return rows[0];
  }

  async upsertMany(
    rows: readonly ProductListingIndexUpsertInput[],
  ): Promise<ProductListingIndex[]> {
    if (rows.length === 0) {
      return [];
    }

    assertUniqueBy(rows, (row) => row.productId, "product listing row");
    const now = nowIso();
    const result: ProductListingIndex[] = [];

    for (const chunk of chunkArray(rows)) {
      const values = chunk.map((row) => this.toInsertRow(row, now));
      const inserted = await this.connection
        .insert(productListingIndex)
        .values(values)
        .onConflictDoUpdate({
          target: productListingIndex.productId,
          setWhere: eq(productListingIndex.storeId, this.storeId),
          set: {
            entityType: sql`excluded.entity_type`,
            vendorId: sql`excluded.vendor_id`,
            handle: sql`excluded.handle`,
            status: sql`excluded.status`,
            publishedAt: sql`excluded.published_at`,
            productCreatedAt: sql`excluded.product_created_at`,
            productUpdatedAt: sql`excluded.product_updated_at`,
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
    productId: string,
    patch: ProductListingIndexPatchInput,
  ): Promise<ProductListingIndex | null> {
    const updateData = this.toPatchRow(patch);
    const rows = await this.connection
      .update(productListingIndex)
      .set(updateData)
      .where(
        and(
          eq(productListingIndex.storeId, this.storeId),
          eq(productListingIndex.productId, productId),
        ),
      )
      .returning();

    return rows[0] ?? null;
  }

  async delete(productId: string): Promise<boolean> {
    const rows = await this.connection
      .delete(productListingIndex)
      .where(
        and(
          eq(productListingIndex.storeId, this.storeId),
          eq(productListingIndex.productId, productId),
        ),
      )
      .returning({ productId: productListingIndex.productId });

    return rows.length > 0;
  }

  async deleteByProductIds(productIds: readonly string[]): Promise<number> {
    if (productIds.length === 0) {
      return 0;
    }

    let deleted = 0;
    for (const chunk of chunkArray([...new Set(productIds)])) {
      const rows = await this.connection
        .delete(productListingIndex)
        .where(
          and(
            eq(productListingIndex.storeId, this.storeId),
            inArray(productListingIndex.productId, chunk),
          ),
        )
        .returning({ productId: productListingIndex.productId });

      deleted += rows.length;
    }

    return deleted;
  }

  async deleteByProductDocIds(productDocIds: readonly number[]): Promise<number> {
    if (productDocIds.length === 0) {
      return 0;
    }

    for (const productDocId of productDocIds) {
      assertPositiveDocId(productDocId, "productDocId");
    }

    let deleted = 0;
    for (const chunk of chunkArray([...new Set(productDocIds)])) {
      const rows = await this.connection
        .delete(productListingIndex)
        .where(
          and(
            eq(productListingIndex.storeId, this.storeId),
            inArray(productListingIndex.productDocId, chunk),
          ),
        )
        .returning({ productDocId: productListingIndex.productDocId });

      deleted += rows.length;
    }

    return deleted;
  }

  private toInsertRow(row: ProductListingIndexUpsertInput, now: string): NewProductListingIndex {
    assertPositiveDocId(row.productDocId, "productDocId");
    assertProductEntityType(row.entityType);
    assertListingStatus(row.status);
    assertNonNegativeInteger(row.totalStock, "totalStock");

    return {
      storeId: this.storeId,
      productId: row.productId,
      productDocId: row.productDocId,
      entityType: row.entityType,
      vendorId: row.vendorId ?? null,
      handle: row.handle ?? null,
      status: row.status,
      publishedAt: row.publishedAt ?? null,
      productCreatedAt: row.productCreatedAt,
      productUpdatedAt: row.productUpdatedAt,
      totalStock: row.totalStock,
      indexedAt: now,
      updatedAt: now,
    };
  }

  private toPatchRow(patch: ProductListingIndexPatchInput): Partial<NewProductListingIndex> {
    const updateData: Partial<NewProductListingIndex> = {
      updatedAt: nowIso(),
    };

    if (patch.entityType !== undefined) {
      assertProductEntityType(patch.entityType);
      updateData.entityType = patch.entityType;
    }
    if (patch.vendorId !== undefined) updateData.vendorId = patch.vendorId;
    if (patch.handle !== undefined) updateData.handle = patch.handle;
    if (patch.status !== undefined) {
      assertListingStatus(patch.status);
      updateData.status = patch.status;
    }
    if (patch.publishedAt !== undefined) updateData.publishedAt = patch.publishedAt;
    if (patch.productCreatedAt !== undefined) {
      updateData.productCreatedAt = patch.productCreatedAt;
    }
    if (patch.productUpdatedAt !== undefined) {
      updateData.productUpdatedAt = patch.productUpdatedAt;
    }
    if (patch.totalStock !== undefined) {
      assertNonNegativeInteger(patch.totalStock, "totalStock");
      updateData.totalStock = patch.totalStock;
    }

    return updateData;
  }
}
