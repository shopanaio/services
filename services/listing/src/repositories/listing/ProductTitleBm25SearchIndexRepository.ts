import { and, count, eq, inArray, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { Transactional, ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  productTitleBm25SearchIndex,
  type NewProductTitleBm25SearchIndex,
  type ProductTitleBm25SearchIndex,
} from "../models/index.js";
import {
  assertListingStatus,
  assertNonEmptyString,
  assertNonNegativeInteger,
  assertProductKind,
  assertUniqueBy,
  chunkArray,
  nowIso,
  type ProductTitleBm25RowInput,
} from "./listingRepositoryTypes.js";

export class ProductTitleBm25SearchIndexRepository extends BaseRepository {
  @ReadOnly()
  async exists(productId: string, locale: string): Promise<boolean> {
    assertNonEmptyString(locale, "locale");
    const rows = await this.connection
      .select({ productId: productTitleBm25SearchIndex.productId })
      .from(productTitleBm25SearchIndex)
      .where(
        and(
          eq(productTitleBm25SearchIndex.storeId, this.storeId),
          eq(productTitleBm25SearchIndex.productId, productId),
          eq(productTitleBm25SearchIndex.locale, locale)
        )
      )
      .limit(1);

    return rows.length > 0;
  }

  @ReadOnly()
  async find(
    productId: string,
    locale: string
  ): Promise<ProductTitleBm25SearchIndex | null> {
    assertNonEmptyString(locale, "locale");
    const rows = await this.connection
      .select()
      .from(productTitleBm25SearchIndex)
      .where(
        and(
          eq(productTitleBm25SearchIndex.storeId, this.storeId),
          eq(productTitleBm25SearchIndex.productId, productId),
          eq(productTitleBm25SearchIndex.locale, locale)
        )
      )
      .limit(1);

    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByProductId(
    productId: string
  ): Promise<ProductTitleBm25SearchIndex[]> {
    return this.connection
      .select()
      .from(productTitleBm25SearchIndex)
      .where(
        and(
          eq(productTitleBm25SearchIndex.storeId, this.storeId),
          eq(productTitleBm25SearchIndex.productId, productId)
        )
      );
  }

  @ReadOnly()
  async getByProductIds(
    productIds: readonly string[],
    locales?: readonly string[]
  ): Promise<ProductTitleBm25SearchIndex[]> {
    if (productIds.length === 0) {
      return [];
    }

    const uniqueProductIds = [...new Set(productIds)];
    const uniqueLocales = locales ? [...new Set(locales)] : [];
    for (const locale of uniqueLocales) {
      assertNonEmptyString(locale, "locale");
    }

    const where =
      uniqueLocales.length > 0
        ? and(
            eq(productTitleBm25SearchIndex.storeId, this.storeId),
            inArray(productTitleBm25SearchIndex.productId, uniqueProductIds),
            inArray(productTitleBm25SearchIndex.locale, uniqueLocales)
          )
        : and(
            eq(productTitleBm25SearchIndex.storeId, this.storeId),
            inArray(productTitleBm25SearchIndex.productId, uniqueProductIds)
          );

    return this.connection
      .select()
      .from(productTitleBm25SearchIndex)
      .where(where);
  }

  @ReadOnly()
  async getLocalesByProductId(productId: string): Promise<string[]> {
    const rows = await this.connection
      .select({ locale: productTitleBm25SearchIndex.locale })
      .from(productTitleBm25SearchIndex)
      .where(
        and(
          eq(productTitleBm25SearchIndex.storeId, this.storeId),
          eq(productTitleBm25SearchIndex.productId, productId)
        )
      );

    return rows.map((row) => row.locale);
  }

  @ReadOnly()
  async count(): Promise<number> {
    const rows = await this.connection
      .select({ value: count() })
      .from(productTitleBm25SearchIndex)
      .where(eq(productTitleBm25SearchIndex.storeId, this.storeId));

    return rows[0]?.value ?? 0;
  }

  async upsert(
    row: ProductTitleBm25RowInput
  ): Promise<ProductTitleBm25SearchIndex> {
    const rows = await this.upsertMany([row]);
    return rows[0];
  }

  async upsertMany(
    rows: readonly ProductTitleBm25RowInput[]
  ): Promise<ProductTitleBm25SearchIndex[]> {
    if (rows.length === 0) {
      return [];
    }

    assertUniqueBy(
      rows,
      (row) => `${row.productId}:${row.locale}`,
      "product title BM25 row"
    );

    const now = nowIso();
    const result: ProductTitleBm25SearchIndex[] = [];

    for (const chunk of chunkArray(rows)) {
      const values = chunk.map((row) => this.toInsertRow(row, now));
      const inserted = await this.connection
        .insert(productTitleBm25SearchIndex)
        .values(values)
        .onConflictDoUpdate({
          target: [
            productTitleBm25SearchIndex.productId,
            productTitleBm25SearchIndex.locale,
          ],
          setWhere: eq(productTitleBm25SearchIndex.storeId, this.storeId),
          set: {
            kind: sql`excluded.kind`,
            status: sql`excluded.status`,
            publishedAt: sql`excluded.published_at`,
            productCreatedAt: sql`excluded.product_created_at`,
            productUpdatedAt: sql`excluded.product_updated_at`,
            productRevision: sql`excluded.product_revision`,
            title: sql`excluded.title`,
            indexedAt: now,
            updatedAt: now,
          },
        })
        .returning();

      result.push(...inserted);
    }

    return result;
  }

  @Transactional()
  async replaceForProduct(
    productId: string,
    rows: readonly ProductTitleBm25RowInput[]
  ): Promise<ProductTitleBm25SearchIndex[]> {
    for (const row of rows) {
      if (row.productId !== productId) {
        throw new Error("BM25 title row productId must match replace key");
      }
    }

    await this.deleteByProductId(productId);
    return this.upsertMany(rows);
  }

  @Transactional()
  async replaceForProducts(
    rowsByProductId: ReadonlyMap<string, readonly ProductTitleBm25RowInput[]>
  ): Promise<ProductTitleBm25SearchIndex[]> {
    if (rowsByProductId.size === 0) {
      return [];
    }

    const productIds = [...rowsByProductId.keys()];
    const rows = [...rowsByProductId.entries()].flatMap(([productId, productRows]) => {
      for (const row of productRows) {
        if (row.productId !== productId) {
          throw new Error("BM25 title row productId must match map key");
        }
      }
      return [...productRows];
    });

    await this.deleteByProductIds(productIds);
    return this.upsertMany(rows);
  }

  async delete(productId: string, locale: string): Promise<boolean> {
    assertNonEmptyString(locale, "locale");
    const rows = await this.connection
      .delete(productTitleBm25SearchIndex)
      .where(
        and(
          eq(productTitleBm25SearchIndex.storeId, this.storeId),
          eq(productTitleBm25SearchIndex.productId, productId),
          eq(productTitleBm25SearchIndex.locale, locale)
        )
      )
      .returning({ productId: productTitleBm25SearchIndex.productId });

    return rows.length > 0;
  }

  async deleteByProductId(productId: string): Promise<number> {
    const rows = await this.connection
      .delete(productTitleBm25SearchIndex)
      .where(
        and(
          eq(productTitleBm25SearchIndex.storeId, this.storeId),
          eq(productTitleBm25SearchIndex.productId, productId)
        )
      )
      .returning({ productId: productTitleBm25SearchIndex.productId });

    return rows.length;
  }

  async deleteByProductIds(productIds: readonly string[]): Promise<number> {
    if (productIds.length === 0) {
      return 0;
    }

    let deleted = 0;
    for (const chunk of chunkArray([...new Set(productIds)])) {
      const rows = await this.connection
        .delete(productTitleBm25SearchIndex)
        .where(
          and(
            eq(productTitleBm25SearchIndex.storeId, this.storeId),
            inArray(productTitleBm25SearchIndex.productId, chunk)
          )
        )
        .returning({ productId: productTitleBm25SearchIndex.productId });

      deleted += rows.length;
    }

    return deleted;
  }

  async deleteByLocale(locale: string): Promise<number> {
    assertNonEmptyString(locale, "locale");
    const rows = await this.connection
      .delete(productTitleBm25SearchIndex)
      .where(
        and(
          eq(productTitleBm25SearchIndex.storeId, this.storeId),
          eq(productTitleBm25SearchIndex.locale, locale)
        )
      )
      .returning({ locale: productTitleBm25SearchIndex.locale });

    return rows.length;
  }

  async deleteAllForCurrentProject(): Promise<number> {
    const rows = await this.connection
      .delete(productTitleBm25SearchIndex)
      .where(eq(productTitleBm25SearchIndex.storeId, this.storeId))
      .returning({ productId: productTitleBm25SearchIndex.productId });

    return rows.length;
  }

  private toInsertRow(
    row: ProductTitleBm25RowInput,
    now: string
  ): NewProductTitleBm25SearchIndex {
    assertNonEmptyString(row.locale, "locale");
    assertProductKind(row.kind);
    assertListingStatus(row.status);
    assertNonNegativeInteger(row.productRevision, "productRevision");

    return {
      searchId: uuidv7(),
      storeId: this.storeId,
      productId: row.productId,
      locale: row.locale,
      kind: row.kind,
      status: row.status,
      publishedAt: row.publishedAt ?? null,
      productCreatedAt: row.productCreatedAt,
      productUpdatedAt: row.productUpdatedAt,
      productRevision: row.productRevision,
      title: row.title,
      indexedAt: now,
      updatedAt: now,
    };
  }
}
