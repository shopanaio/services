import { and, count, eq, inArray, sql } from "drizzle-orm";
import { Transactional, ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  listingPostingVariantProjectionBlock,
  variantListingIndex,
  type ListingPostingVariantProjectionBlock,
  type NewListingPostingVariantProjectionBlock,
} from "../models/index.js";
import {
  DEFAULT_VARIANT_PROJECTION_BLOCK_SIZE,
  assertNonNegativeInteger,
  assertPositiveDocId,
  assertUniqueBy,
  chunkArray,
  uniqueValues,
  type ProjectionBlockRowInput,
} from "./listingRepositoryTypes.js";

export class ListingPostingVariantProjectionBlockRepository extends BaseRepository {
  @ReadOnly()
  async exists(blockId: number): Promise<boolean> {
    this.assertBlockId(blockId);
    const rows = await this.connection
      .select({ blockId: listingPostingVariantProjectionBlock.blockId })
      .from(listingPostingVariantProjectionBlock)
      .where(
        and(
          eq(listingPostingVariantProjectionBlock.storeId, this.storeId),
          eq(listingPostingVariantProjectionBlock.blockId, blockId),
        ),
      )
      .limit(1);

    return rows.length > 0;
  }

  @ReadOnly()
  async findByBlockId(blockId: number): Promise<ListingPostingVariantProjectionBlock | null> {
    this.assertBlockId(blockId);
    const rows = await this.connection
      .select()
      .from(listingPostingVariantProjectionBlock)
      .where(
        and(
          eq(listingPostingVariantProjectionBlock.storeId, this.storeId),
          eq(listingPostingVariantProjectionBlock.blockId, blockId),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByBlockIds(
    blockIds: readonly number[],
  ): Promise<ListingPostingVariantProjectionBlock[]> {
    if (blockIds.length === 0) {
      return [];
    }

    for (const blockId of blockIds) {
      this.assertBlockId(blockId);
    }

    return this.connection
      .select()
      .from(listingPostingVariantProjectionBlock)
      .where(
        and(
          eq(listingPostingVariantProjectionBlock.storeId, this.storeId),
          inArray(listingPostingVariantProjectionBlock.blockId, [...new Set(blockIds)]),
        ),
      );
  }

  @ReadOnly()
  async getBlocksForVariantDocIds(
    variantDocIds: readonly number[],
    blockSize = DEFAULT_VARIANT_PROJECTION_BLOCK_SIZE,
  ): Promise<ListingPostingVariantProjectionBlock[]> {
    const blockIds = this.getBlockIdsForVariantDocIds(variantDocIds, blockSize);
    return this.getByBlockIds(blockIds);
  }

  @ReadOnly()
  async count(): Promise<number> {
    const rows = await this.connection
      .select({ value: count() })
      .from(listingPostingVariantProjectionBlock)
      .where(eq(listingPostingVariantProjectionBlock.storeId, this.storeId));

    return rows[0]?.value ?? 0;
  }

  async upsertBlock(row: ProjectionBlockRowInput): Promise<ListingPostingVariantProjectionBlock> {
    const rows = await this.upsertBlocks([row]);
    return rows[0];
  }

  async upsertBlocks(
    rows: readonly ProjectionBlockRowInput[],
  ): Promise<ListingPostingVariantProjectionBlock[]> {
    if (rows.length === 0) {
      return [];
    }

    assertUniqueBy(rows, (row) => String(row.blockId), "projection block row");
    const result: ListingPostingVariantProjectionBlock[] = [];

    for (const chunk of chunkArray(rows)) {
      const values = chunk.map((row) => this.toInsertRow(row));
      const inserted = await this.connection
        .insert(listingPostingVariantProjectionBlock)
        .values(values)
        .onConflictDoUpdate({
          target: [
            listingPostingVariantProjectionBlock.storeId,
            listingPostingVariantProjectionBlock.blockId,
          ],
          setWhere: eq(listingPostingVariantProjectionBlock.storeId, this.storeId),
          set: {
            variantDocFrom: sql`excluded.variant_doc_from`,
            variantDocTo: sql`excluded.variant_doc_to`,
            variantBitmap: sql`excluded.variant_bitmap`,
            productBitmap: sql`excluded.product_bitmap`,
            variantCount: sql`excluded.variant_count`,
            productCount: sql`excluded.product_count`,
          },
        })
        .returning();

      result.push(...inserted);
    }

    return result;
  }

  @Transactional()
  async replaceBlocks(
    rows: readonly ProjectionBlockRowInput[],
  ): Promise<ListingPostingVariantProjectionBlock[]> {
    await this.deleteAllForCurrentProject();
    return this.upsertBlocks(rows);
  }

  async deleteBlock(blockId: number): Promise<boolean> {
    this.assertBlockId(blockId);
    const rows = await this.connection
      .delete(listingPostingVariantProjectionBlock)
      .where(
        and(
          eq(listingPostingVariantProjectionBlock.storeId, this.storeId),
          eq(listingPostingVariantProjectionBlock.blockId, blockId),
        ),
      )
      .returning({ blockId: listingPostingVariantProjectionBlock.blockId });

    return rows.length > 0;
  }

  async deleteBlocks(blockIds: readonly number[]): Promise<number> {
    if (blockIds.length === 0) {
      return 0;
    }

    for (const blockId of blockIds) {
      this.assertBlockId(blockId);
    }

    let deleted = 0;
    for (const chunk of chunkArray([...new Set(blockIds)])) {
      const rows = await this.connection
        .delete(listingPostingVariantProjectionBlock)
        .where(
          and(
            eq(listingPostingVariantProjectionBlock.storeId, this.storeId),
            inArray(listingPostingVariantProjectionBlock.blockId, chunk),
          ),
        )
        .returning({ blockId: listingPostingVariantProjectionBlock.blockId });

      deleted += rows.length;
    }

    return deleted;
  }

  async deleteAllForCurrentProject(): Promise<number> {
    const rows = await this.connection
      .delete(listingPostingVariantProjectionBlock)
      .where(eq(listingPostingVariantProjectionBlock.storeId, this.storeId))
      .returning({ blockId: listingPostingVariantProjectionBlock.blockId });

    return rows.length;
  }

  getBlockIdsForVariantDocIds(
    variantDocIds: readonly number[],
    blockSize = DEFAULT_VARIANT_PROJECTION_BLOCK_SIZE,
  ): number[] {
    this.assertBlockSize(blockSize);
    if (variantDocIds.length === 0) {
      return [];
    }

    const blockIds = variantDocIds.map((variantDocId) => {
      assertPositiveDocId(variantDocId, "variantDocId");
      return Math.floor((variantDocId - 1) / blockSize);
    });

    return uniqueValues(blockIds).sort((left, right) => left - right);
  }

  @Transactional()
  async refreshBlocksForVariantDocIds(
    variantDocIds: readonly number[],
    blockSize = DEFAULT_VARIANT_PROJECTION_BLOCK_SIZE,
  ): Promise<ListingPostingVariantProjectionBlock[]> {
    const blockIds = this.getBlockIdsForVariantDocIds(variantDocIds, blockSize);
    if (blockIds.length === 0) {
      return [];
    }

    const result: ListingPostingVariantProjectionBlock[] = [];
    for (const blockId of blockIds) {
      const row = await this.refreshBlock(blockId, blockSize);
      if (row) {
        result.push(row);
      }
    }

    return result;
  }

  @Transactional()
  async refreshBlocksForProductDocIds(
    productDocIds: readonly number[],
    blockSize = DEFAULT_VARIANT_PROJECTION_BLOCK_SIZE,
  ): Promise<ListingPostingVariantProjectionBlock[]> {
    if (productDocIds.length === 0) {
      return [];
    }

    for (const productDocId of productDocIds) {
      assertPositiveDocId(productDocId, "productDocId");
    }

    const rows = await this.connection
      .select({ variantDocId: variantListingIndex.variantDocId })
      .from(variantListingIndex)
      .where(
        and(
          eq(variantListingIndex.storeId, this.storeId),
          inArray(variantListingIndex.productDocId, [...new Set(productDocIds)]),
        ),
      );

    return this.refreshBlocksForVariantDocIds(
      rows.map((row) => row.variantDocId),
      blockSize,
    );
  }

  @Transactional()
  async rebuildProjectBlocks(
    blockSize = DEFAULT_VARIANT_PROJECTION_BLOCK_SIZE,
  ): Promise<ListingPostingVariantProjectionBlock[]> {
    this.assertBlockSize(blockSize);
    await this.deleteAllForCurrentProject();

    const rows = await this.connection
      .select({ variantDocId: variantListingIndex.variantDocId })
      .from(variantListingIndex)
      .where(eq(variantListingIndex.storeId, this.storeId));

    return this.refreshBlocksForVariantDocIds(
      rows.map((row) => row.variantDocId),
      blockSize,
    );
  }

  private async refreshBlock(
    blockId: number,
    blockSize: number,
  ): Promise<ListingPostingVariantProjectionBlock | null> {
    this.assertBlockId(blockId);
    this.assertBlockSize(blockSize);
    const variantDocFrom = blockId * blockSize + 1;
    const variantDocTo = variantDocFrom + blockSize;

    const rows = await this.connection.execute<ListingPostingVariantProjectionBlock>(sql`
        WITH variants AS (
          SELECT
            variant_doc_id,
            product_doc_id
          FROM listing.variant_listing_index
          WHERE store_id = ${this.storeId}::uuid
            AND variant_doc_id >= ${variantDocFrom}
            AND variant_doc_id < ${variantDocTo}
        ),
        bitmaps AS (
          SELECT
            rb_build_agg(variant_doc_id) AS variant_bitmap,
            rb_build_agg(product_doc_id) AS product_bitmap
          FROM variants
        )
        INSERT INTO listing.listing_posting_variant_storeion_block (
          store_id,
          block_id,
          variant_doc_from,
          variant_doc_to,
          variant_bitmap,
          product_bitmap,
          variant_count,
          product_count
        )
        SELECT
          ${this.storeId}::uuid,
          ${blockId},
          ${variantDocFrom},
          ${variantDocTo},
          variant_bitmap,
          product_bitmap,
          rb_cardinality(variant_bitmap)::int,
          rb_cardinality(product_bitmap)::int
        FROM bitmaps
        WHERE variant_bitmap IS NOT NULL
        ON CONFLICT (store_id, block_id)
        DO UPDATE SET
          variant_doc_from = excluded.variant_doc_from,
          variant_doc_to = excluded.variant_doc_to,
          variant_bitmap = excluded.variant_bitmap,
          product_bitmap = excluded.product_bitmap,
          variant_count = excluded.variant_count,
          product_count = excluded.product_count
        RETURNING
          store_id AS "storeId",
          block_id AS "blockId",
          variant_doc_from AS "variantDocFrom",
          variant_doc_to AS "variantDocTo",
          variant_bitmap AS "variantBitmap",
          product_bitmap AS "productBitmap",
          variant_count AS "variantCount",
          product_count AS "productCount"
      `);

    const row = rows[0] ?? null;
    if (!row) {
      await this.deleteBlock(blockId);
    }
    return row;
  }

  private toInsertRow(row: ProjectionBlockRowInput): NewListingPostingVariantProjectionBlock {
    this.validateProjectionRow(row);
    const variantBitmapSql = sql`${row.variantBitmap}::roaringbitmap`;
    const productBitmapSql = sql`${row.productBitmap}::roaringbitmap`;

    return {
      storeId: this.storeId,
      blockId: row.blockId,
      variantDocFrom: row.variantDocFrom,
      variantDocTo: row.variantDocTo,
      variantBitmap: variantBitmapSql as unknown as string,
      productBitmap: productBitmapSql as unknown as string,
      variantCount: sql`rb_cardinality(${variantBitmapSql})::int` as unknown as number,
      productCount: sql`rb_cardinality(${productBitmapSql})::int` as unknown as number,
    };
  }

  private validateProjectionRow(row: ProjectionBlockRowInput): void {
    this.assertBlockId(row.blockId);
    assertPositiveDocId(row.variantDocFrom, "variantDocFrom");
    assertPositiveDocId(row.variantDocTo, "variantDocTo");
    if (row.variantDocTo <= row.variantDocFrom) {
      throw new Error("variantDocTo must be greater than variantDocFrom");
    }
    assertNonNegativeInteger(row.variantCount, "variantCount");
    assertNonNegativeInteger(row.productCount, "productCount");
  }

  private assertBlockId(blockId: number): void {
    if (!Number.isInteger(blockId) || blockId < 0) {
      throw new Error("blockId must be a non-negative integer");
    }
  }

  private assertBlockSize(blockSize: number): void {
    assertPositiveDocId(blockSize, "blockSize");
  }
}
