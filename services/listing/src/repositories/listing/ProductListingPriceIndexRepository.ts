import { and, count, eq, inArray, sql } from "drizzle-orm";
import { Transactional, ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  productListingPriceIndex,
  type NewProductListingPriceIndex,
  type ProductListingPriceIndex,
} from "../models/index.js";
import {
  assertCurrency,
  assertNonNegativeInteger,
  assertUniqueBy,
  chunkArray,
  nowIso,
  type ProductListingPriceRowInput,
} from "./listingRepositoryTypes.js";

export class ProductListingPriceIndexRepository extends BaseRepository {
  @ReadOnly()
  async exists(productId: string, currency: string): Promise<boolean> {
    assertCurrency(currency);
    const rows = await this.connection
      .select({ productId: productListingPriceIndex.productId })
      .from(productListingPriceIndex)
      .where(
        and(
          eq(productListingPriceIndex.storeId, this.storeId),
          eq(productListingPriceIndex.productId, productId),
          eq(productListingPriceIndex.currency, currency),
        ),
      )
      .limit(1);

    return rows.length > 0;
  }

  @ReadOnly()
  async find(productId: string, currency: string): Promise<ProductListingPriceIndex | null> {
    assertCurrency(currency);
    const rows = await this.connection
      .select()
      .from(productListingPriceIndex)
      .where(
        and(
          eq(productListingPriceIndex.storeId, this.storeId),
          eq(productListingPriceIndex.productId, productId),
          eq(productListingPriceIndex.currency, currency),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByProductId(productId: string): Promise<ProductListingPriceIndex[]> {
    return this.connection
      .select()
      .from(productListingPriceIndex)
      .where(
        and(
          eq(productListingPriceIndex.storeId, this.storeId),
          eq(productListingPriceIndex.productId, productId),
        ),
      );
  }

  @ReadOnly()
  async getByProductIds(
    productIds: readonly string[],
    currencies?: readonly string[],
  ): Promise<ProductListingPriceIndex[]> {
    if (productIds.length === 0) {
      return [];
    }

    const uniqueProductIds = [...new Set(productIds)];
    const uniqueCurrencies = currencies ? [...new Set(currencies)] : [];
    for (const currency of uniqueCurrencies) {
      assertCurrency(currency);
    }

    const where =
      uniqueCurrencies.length > 0
        ? and(
            eq(productListingPriceIndex.storeId, this.storeId),
            inArray(productListingPriceIndex.productId, uniqueProductIds),
            inArray(productListingPriceIndex.currency, uniqueCurrencies),
          )
        : and(
            eq(productListingPriceIndex.storeId, this.storeId),
            inArray(productListingPriceIndex.productId, uniqueProductIds),
          );

    return this.connection.select().from(productListingPriceIndex).where(where);
  }

  @ReadOnly()
  async count(): Promise<number> {
    const rows = await this.connection
      .select({ value: count() })
      .from(productListingPriceIndex)
      .where(eq(productListingPriceIndex.storeId, this.storeId));

    return rows[0]?.value ?? 0;
  }

  async upsert(row: ProductListingPriceRowInput): Promise<ProductListingPriceIndex> {
    const rows = await this.upsertMany([row]);
    return rows[0];
  }

  async upsertMany(
    rows: readonly ProductListingPriceRowInput[],
  ): Promise<ProductListingPriceIndex[]> {
    if (rows.length === 0) {
      return [];
    }

    assertUniqueBy(rows, (row) => `${row.productId}:${row.currency}`, "product listing price row");

    const now = nowIso();
    const result: ProductListingPriceIndex[] = [];

    for (const chunk of chunkArray(rows)) {
      const values = chunk.map((row) => this.toInsertRow(row, now));
      const inserted = await this.connection
        .insert(productListingPriceIndex)
        .values(values)
        .onConflictDoUpdate({
          target: [productListingPriceIndex.productId, productListingPriceIndex.currency],
          setWhere: eq(productListingPriceIndex.storeId, this.storeId),
          set: {
            minPriceMinor: sql`excluded.min_price_minor`,
            maxPriceMinor: sql`excluded.max_price_minor`,
            hasPrice: sql`excluded.has_price`,
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
    rows: readonly ProductListingPriceRowInput[],
  ): Promise<ProductListingPriceIndex[]> {
    for (const row of rows) {
      if (row.productId !== productId) {
        throw new Error("Product price row productId must match replace key");
      }
    }

    await this.deleteByProductId(productId);
    return this.upsertMany(rows);
  }

  @Transactional()
  async replaceForProducts(
    rowsByProductId: ReadonlyMap<string, readonly ProductListingPriceRowInput[]>,
  ): Promise<ProductListingPriceIndex[]> {
    if (rowsByProductId.size === 0) {
      return [];
    }

    const productIds = [...rowsByProductId.keys()];
    const rows = [...rowsByProductId.entries()].flatMap(([productId, productRows]) => {
      for (const row of productRows) {
        if (row.productId !== productId) {
          throw new Error("Product price row productId must match map key");
        }
      }
      return [...productRows];
    });

    await this.deleteByProductIds(productIds);
    return this.upsertMany(rows);
  }

  async delete(productId: string, currency: string): Promise<boolean> {
    assertCurrency(currency);
    const rows = await this.connection
      .delete(productListingPriceIndex)
      .where(
        and(
          eq(productListingPriceIndex.storeId, this.storeId),
          eq(productListingPriceIndex.productId, productId),
          eq(productListingPriceIndex.currency, currency),
        ),
      )
      .returning({ productId: productListingPriceIndex.productId });

    return rows.length > 0;
  }

  async deleteByProductId(productId: string): Promise<number> {
    const rows = await this.connection
      .delete(productListingPriceIndex)
      .where(
        and(
          eq(productListingPriceIndex.storeId, this.storeId),
          eq(productListingPriceIndex.productId, productId),
        ),
      )
      .returning({ productId: productListingPriceIndex.productId });

    return rows.length;
  }

  async deleteByProductIds(productIds: readonly string[]): Promise<number> {
    if (productIds.length === 0) {
      return 0;
    }

    let deleted = 0;
    for (const chunk of chunkArray([...new Set(productIds)])) {
      const rows = await this.connection
        .delete(productListingPriceIndex)
        .where(
          and(
            eq(productListingPriceIndex.storeId, this.storeId),
            inArray(productListingPriceIndex.productId, chunk),
          ),
        )
        .returning({ productId: productListingPriceIndex.productId });

      deleted += rows.length;
    }

    return deleted;
  }

  private toInsertRow(row: ProductListingPriceRowInput, now: string): NewProductListingPriceIndex {
    assertCurrency(row.currency);

    if (!row.hasPrice) {
      if (row.minPriceMinor != null || row.maxPriceMinor != null) {
        throw new Error("hasPrice=false requires null product price bounds");
      }

      return {
        storeId: this.storeId,
        productId: row.productId,
        currency: row.currency,
        hasPrice: false,
        minPriceMinor: null,
        maxPriceMinor: null,
        indexedAt: now,
        updatedAt: now,
      };
    }

    if (row.minPriceMinor == null || row.maxPriceMinor == null) {
      throw new Error("hasPrice=true requires non-null product price bounds");
    }

    assertNonNegativeInteger(row.minPriceMinor, "minPriceMinor");
    assertNonNegativeInteger(row.maxPriceMinor, "maxPriceMinor");
    if (row.maxPriceMinor < row.minPriceMinor) {
      throw new Error("maxPriceMinor must be greater than or equal to minPriceMinor");
    }

    return {
      storeId: this.storeId,
      productId: row.productId,
      currency: row.currency,
      hasPrice: true,
      minPriceMinor: row.minPriceMinor,
      maxPriceMinor: row.maxPriceMinor,
      indexedAt: now,
      updatedAt: now,
    };
  }
}
