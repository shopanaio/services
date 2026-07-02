import { and, count, eq, inArray, sql } from "drizzle-orm";
import { Transactional, ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  listingPostingProductSort,
  type ListingPostingProductSort,
  type NewListingPostingProductSort,
} from "../models/index.js";
import {
  assertNonEmptyString,
  assertPositiveDocId,
  assertUniqueBy,
  chunkArray,
  normalizeSortKey,
  type ProductSortKeyInput,
  type ProductSortRowInput,
} from "./listingRepositoryTypes.js";

export class ListingPostingProductSortRepository extends BaseRepository {
  @ReadOnly()
  async exists(key: ProductSortKeyInput): Promise<boolean> {
    const normalized = this.normalizeKey(key);
    const rows = await this.connection
      .select({ productDocId: listingPostingProductSort.productDocId })
      .from(listingPostingProductSort)
      .where(this.keyWhere(normalized))
      .limit(1);

    return rows.length > 0;
  }

  @ReadOnly()
  async find(
    key: ProductSortKeyInput
  ): Promise<ListingPostingProductSort | null> {
    const normalized = this.normalizeKey(key);
    const rows = await this.connection
      .select()
      .from(listingPostingProductSort)
      .where(this.keyWhere(normalized))
      .limit(1);

    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByProductDocId(
    productDocId: number
  ): Promise<ListingPostingProductSort[]> {
    assertPositiveDocId(productDocId, "productDocId");
    return this.connection
      .select()
      .from(listingPostingProductSort)
      .where(
        and(
          eq(listingPostingProductSort.projectId, this.storeId),
          eq(listingPostingProductSort.productDocId, productDocId)
        )
      );
  }

  @ReadOnly()
  async getByProductDocIds(
    productDocIds: readonly number[]
  ): Promise<ListingPostingProductSort[]> {
    if (productDocIds.length === 0) {
      return [];
    }

    for (const productDocId of productDocIds) {
      assertPositiveDocId(productDocId, "productDocId");
    }

    return this.connection
      .select()
      .from(listingPostingProductSort)
      .where(
        and(
          eq(listingPostingProductSort.projectId, this.storeId),
          inArray(listingPostingProductSort.productDocId, [
            ...new Set(productDocIds),
          ])
        )
      );
  }

  @ReadOnly()
  async getByProductIds(
    productIds: readonly string[]
  ): Promise<ListingPostingProductSort[]> {
    if (productIds.length === 0) {
      return [];
    }

    return this.connection
      .select()
      .from(listingPostingProductSort)
      .where(
        and(
          eq(listingPostingProductSort.projectId, this.storeId),
          inArray(listingPostingProductSort.productId, [...new Set(productIds)])
        )
      );
  }

  @ReadOnly()
  async count(): Promise<number> {
    const rows = await this.connection
      .select({ value: count() })
      .from(listingPostingProductSort)
      .where(eq(listingPostingProductSort.projectId, this.storeId));

    return rows[0]?.value ?? 0;
  }

  async upsert(
    row: ProductSortRowInput
  ): Promise<ListingPostingProductSort> {
    const rows = await this.upsertMany([row]);
    return rows[0];
  }

  async upsertMany(
    rows: readonly ProductSortRowInput[]
  ): Promise<ListingPostingProductSort[]> {
    if (rows.length === 0) {
      return [];
    }

    assertUniqueBy(rows, (row) => this.rowKey(row), "product sort row");
    const result: ListingPostingProductSort[] = [];

    for (const chunk of chunkArray(rows)) {
      const values = chunk.map((row) => this.toInsertRow(row));
      const inserted = await this.connection
        .insert(listingPostingProductSort)
        .values(values)
        .onConflictDoUpdate({
          target: [
            listingPostingProductSort.projectId,
            listingPostingProductSort.productDocId,
            listingPostingProductSort.sortKind,
            listingPostingProductSort.locale,
            listingPostingProductSort.currency,
            listingPostingProductSort.manualScopeId,
          ],
          setWhere: eq(listingPostingProductSort.projectId, this.storeId),
          set: {
            productId: sql`excluded.product_id`,
            boolValue: sql`excluded.bool_value`,
            timestamptzValue: sql`excluded.timestamptz_value`,
            timestamptzValue2: sql`excluded.timestamptz_value_2`,
            bigintValue: sql`excluded.bigint_value`,
            textValue: sql`excluded.text_value`,
            numericValue: sql`excluded.numeric_value`,
          },
        })
        .returning();

      result.push(...inserted);
    }

    return result;
  }

  @Transactional()
  async replaceForProduct(
    productDocId: number,
    rows: readonly ProductSortRowInput[]
  ): Promise<ListingPostingProductSort[]> {
    assertPositiveDocId(productDocId, "productDocId");
    for (const row of rows) {
      if (row.productDocId !== productDocId) {
        throw new Error("Product sort row productDocId must match replace key");
      }
    }

    await this.deleteByProductDocId(productDocId);
    return this.upsertMany(rows);
  }

  @Transactional()
  async replaceForProducts(
    rowsByProductDocId: ReadonlyMap<number, readonly ProductSortRowInput[]>
  ): Promise<ListingPostingProductSort[]> {
    if (rowsByProductDocId.size === 0) {
      return [];
    }

    const productDocIds = [...rowsByProductDocId.keys()];
    for (const productDocId of productDocIds) {
      assertPositiveDocId(productDocId, "productDocId");
    }

    const rows = [...rowsByProductDocId.entries()].flatMap(
      ([productDocId, productRows]) => {
        for (const row of productRows) {
          if (row.productDocId !== productDocId) {
            throw new Error("Product sort row productDocId must match map key");
          }
        }
        return [...productRows];
      }
    );

    await this.deleteByProductDocIds(productDocIds);
    return this.upsertMany(rows);
  }

  async delete(key: ProductSortKeyInput): Promise<boolean> {
    const normalized = this.normalizeKey(key);
    const rows = await this.connection
      .delete(listingPostingProductSort)
      .where(this.keyWhere(normalized))
      .returning({ productDocId: listingPostingProductSort.productDocId });

    return rows.length > 0;
  }

  async deleteByProductDocId(productDocId: number): Promise<number> {
    assertPositiveDocId(productDocId, "productDocId");
    const rows = await this.connection
      .delete(listingPostingProductSort)
      .where(
        and(
          eq(listingPostingProductSort.projectId, this.storeId),
          eq(listingPostingProductSort.productDocId, productDocId)
        )
      )
      .returning({ productDocId: listingPostingProductSort.productDocId });

    return rows.length;
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
        .delete(listingPostingProductSort)
        .where(
          and(
            eq(listingPostingProductSort.projectId, this.storeId),
            inArray(listingPostingProductSort.productDocId, chunk)
          )
        )
        .returning({ productDocId: listingPostingProductSort.productDocId });

      deleted += rows.length;
    }

    return deleted;
  }

  async deleteByProductId(productId: string): Promise<number> {
    const rows = await this.connection
      .delete(listingPostingProductSort)
      .where(
        and(
          eq(listingPostingProductSort.projectId, this.storeId),
          eq(listingPostingProductSort.productId, productId)
        )
      )
      .returning({ productId: listingPostingProductSort.productId });

    return rows.length;
  }

  async deleteByProductIds(productIds: readonly string[]): Promise<number> {
    if (productIds.length === 0) {
      return 0;
    }

    let deleted = 0;
    for (const chunk of chunkArray([...new Set(productIds)])) {
      const rows = await this.connection
        .delete(listingPostingProductSort)
        .where(
          and(
            eq(listingPostingProductSort.projectId, this.storeId),
            inArray(listingPostingProductSort.productId, chunk)
          )
        )
        .returning({ productId: listingPostingProductSort.productId });

      deleted += rows.length;
    }

    return deleted;
  }

  async deleteAllForCurrentProject(): Promise<number> {
    const rows = await this.connection
      .delete(listingPostingProductSort)
      .where(eq(listingPostingProductSort.projectId, this.storeId))
      .returning({ productDocId: listingPostingProductSort.productDocId });

    return rows.length;
  }

  private toInsertRow(row: ProductSortRowInput): NewListingPostingProductSort {
    const normalized = this.normalizeKey(row);
    return {
      projectId: this.storeId,
      productDocId: normalized.productDocId,
      productId: row.productId,
      sortKind: normalized.sortKind,
      locale: normalized.locale,
      currency: normalized.currency,
      manualScopeId: normalized.manualScopeId,
      boolValue: row.boolValue ?? null,
      timestamptzValue: row.timestamptzValue ?? null,
      timestamptzValue2: row.timestamptzValue2 ?? null,
      bigintValue: row.bigintValue ?? null,
      textValue: row.textValue ?? null,
      numericValue: row.numericValue ?? null,
    };
  }

  private normalizeKey(key: ProductSortKeyInput): ProductSortKeyInput & {
    locale: string;
    currency: string;
    manualScopeId: string;
  } {
    assertPositiveDocId(key.productDocId, "productDocId");
    assertNonEmptyString(key.sortKind, "sortKind");
    return normalizeSortKey(key);
  }

  private rowKey(row: ProductSortRowInput): string {
    const normalized = this.normalizeKey(row);
    return [
      normalized.productDocId,
      normalized.sortKind,
      normalized.locale,
      normalized.currency,
      normalized.manualScopeId,
    ].join(":");
  }

  private keyWhere(key: ProductSortKeyInput & {
    locale: string;
    currency: string;
    manualScopeId: string;
  }) {
    return and(
      eq(listingPostingProductSort.projectId, this.storeId),
      eq(listingPostingProductSort.productDocId, key.productDocId),
      eq(listingPostingProductSort.sortKind, key.sortKind),
      eq(listingPostingProductSort.locale, key.locale),
      eq(listingPostingProductSort.currency, key.currency),
      eq(listingPostingProductSort.manualScopeId, key.manualScopeId)
    );
  }
}
