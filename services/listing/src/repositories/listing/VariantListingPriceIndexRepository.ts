import { and, count, eq, inArray, sql } from "drizzle-orm";
import { Transactional, ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  variantListingIndex,
  variantListingPriceIndex,
  type NewVariantListingPriceIndex,
  type VariantListingPriceIndex,
} from "../models/index.js";
import {
  assertCurrency,
  assertNonEmptyString,
  assertNonNegativeInteger,
  assertPositiveDocId,
  assertUniqueBy,
  chunkArray,
  nowIso,
  type ProductListingPriceRowInput,
  type VariantListingPriceRowInput,
} from "./listingRepositoryTypes.js";

export class VariantListingPriceIndexRepository extends BaseRepository {
  @ReadOnly()
  async exists(variantId: string, currency: string): Promise<boolean> {
    assertCurrency(currency);
    const rows = await this.connection
      .select({ variantId: variantListingPriceIndex.variantId })
      .from(variantListingPriceIndex)
      .where(
        and(
          eq(variantListingPriceIndex.storeId, this.storeId),
          eq(variantListingPriceIndex.variantId, variantId),
          eq(variantListingPriceIndex.currency, currency)
        )
      )
      .limit(1);

    return rows.length > 0;
  }

  @ReadOnly()
  async find(
    variantId: string,
    currency: string
  ): Promise<VariantListingPriceIndex | null> {
    assertCurrency(currency);
    const rows = await this.connection
      .select()
      .from(variantListingPriceIndex)
      .where(
        and(
          eq(variantListingPriceIndex.storeId, this.storeId),
          eq(variantListingPriceIndex.variantId, variantId),
          eq(variantListingPriceIndex.currency, currency)
        )
      )
      .limit(1);

    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByVariantId(variantId: string): Promise<VariantListingPriceIndex[]> {
    return this.connection
      .select()
      .from(variantListingPriceIndex)
      .where(
        and(
          eq(variantListingPriceIndex.storeId, this.storeId),
          eq(variantListingPriceIndex.variantId, variantId)
        )
      );
  }

  @ReadOnly()
  async getByVariantIds(
    variantIds: readonly string[],
    currencies?: readonly string[]
  ): Promise<VariantListingPriceIndex[]> {
    if (variantIds.length === 0) {
      return [];
    }

    const uniqueVariantIds = [...new Set(variantIds)];
    const uniqueCurrencies = currencies ? [...new Set(currencies)] : [];
    for (const currency of uniqueCurrencies) {
      assertCurrency(currency);
    }

    const where =
      uniqueCurrencies.length > 0
        ? and(
            eq(variantListingPriceIndex.storeId, this.storeId),
            inArray(variantListingPriceIndex.variantId, uniqueVariantIds),
            inArray(variantListingPriceIndex.currency, uniqueCurrencies)
          )
        : and(
            eq(variantListingPriceIndex.storeId, this.storeId),
            inArray(variantListingPriceIndex.variantId, uniqueVariantIds)
          );

    return this.connection
      .select()
      .from(variantListingPriceIndex)
      .where(where);
  }

  @ReadOnly()
  async getByProductIds(
    productIds: readonly string[],
    currencies?: readonly string[]
  ): Promise<VariantListingPriceIndex[]> {
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
            eq(variantListingPriceIndex.storeId, this.storeId),
            eq(variantListingIndex.storeId, this.storeId),
            inArray(variantListingIndex.productId, uniqueProductIds),
            inArray(variantListingPriceIndex.currency, uniqueCurrencies)
          )
        : and(
            eq(variantListingPriceIndex.storeId, this.storeId),
            eq(variantListingIndex.storeId, this.storeId),
            inArray(variantListingIndex.productId, uniqueProductIds)
          );

    return this.connection
      .select({
        storeId: variantListingPriceIndex.storeId,
        variantId: variantListingPriceIndex.variantId,
        currency: variantListingPriceIndex.currency,
        variantDocId: variantListingPriceIndex.variantDocId,
        productDocId: variantListingPriceIndex.productDocId,
        productId: variantListingPriceIndex.productId,
        priceMinor: variantListingPriceIndex.priceMinor,
        hasPrice: variantListingPriceIndex.hasPrice,
        indexedAt: variantListingPriceIndex.indexedAt,
        updatedAt: variantListingPriceIndex.updatedAt,
      })
      .from(variantListingPriceIndex)
      .innerJoin(
        variantListingIndex,
        and(
          eq(variantListingIndex.storeId, variantListingPriceIndex.storeId),
          eq(variantListingIndex.variantId, variantListingPriceIndex.variantId)
        )
      )
      .where(where);
  }

  @ReadOnly()
  async count(): Promise<number> {
    const rows = await this.connection
      .select({ value: count() })
      .from(variantListingPriceIndex)
      .where(eq(variantListingPriceIndex.storeId, this.storeId));

    return rows[0]?.value ?? 0;
  }

  async upsert(
    row: VariantListingPriceRowInput
  ): Promise<VariantListingPriceIndex> {
    const rows = await this.upsertMany([row]);
    return rows[0];
  }

  async upsertMany(
    rows: readonly VariantListingPriceRowInput[]
  ): Promise<VariantListingPriceIndex[]> {
    if (rows.length === 0) {
      return [];
    }

    assertUniqueBy(
      rows,
      (row) => `${row.variantId}:${row.currency}`,
      "variant listing price row"
    );

    const now = nowIso();
    const result: VariantListingPriceIndex[] = [];

    for (const chunk of chunkArray(rows)) {
      const values = chunk.map((row) => this.toInsertRow(row, now));
      const inserted = await this.connection
        .insert(variantListingPriceIndex)
        .values(values)
        .onConflictDoUpdate({
          target: [
            variantListingPriceIndex.variantId,
            variantListingPriceIndex.currency,
          ],
          setWhere: eq(variantListingPriceIndex.storeId, this.storeId),
          set: {
            variantDocId: sql`excluded.variant_doc_id`,
            productDocId: sql`excluded.product_doc_id`,
            productId: sql`excluded.product_id`,
            priceMinor: sql`excluded.price_minor`,
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
  async replaceForVariant(
    variantId: string,
    rows: readonly VariantListingPriceRowInput[]
  ): Promise<VariantListingPriceIndex[]> {
    for (const row of rows) {
      if (row.variantId !== variantId) {
        throw new Error("Variant price row variantId must match replace key");
      }
    }

    await this.deleteByVariantId(variantId);
    return this.upsertMany(rows);
  }

  @Transactional()
  async replaceForVariants(
    rowsByVariantId: ReadonlyMap<string, readonly VariantListingPriceRowInput[]>
  ): Promise<VariantListingPriceIndex[]> {
    if (rowsByVariantId.size === 0) {
      return [];
    }

    const variantIds = [...rowsByVariantId.keys()];
    const rows = [...rowsByVariantId.entries()].flatMap(([variantId, variantRows]) => {
      for (const row of variantRows) {
        if (row.variantId !== variantId) {
          throw new Error("Variant price row variantId must match map key");
        }
      }
      return [...variantRows];
    });

    await this.deleteByVariantIds(variantIds);
    return this.upsertMany(rows);
  }

  async delete(variantId: string, currency: string): Promise<boolean> {
    assertCurrency(currency);
    const rows = await this.connection
      .delete(variantListingPriceIndex)
      .where(
        and(
          eq(variantListingPriceIndex.storeId, this.storeId),
          eq(variantListingPriceIndex.variantId, variantId),
          eq(variantListingPriceIndex.currency, currency)
        )
      )
      .returning({ variantId: variantListingPriceIndex.variantId });

    return rows.length > 0;
  }

  async deleteByVariantId(variantId: string): Promise<number> {
    const rows = await this.connection
      .delete(variantListingPriceIndex)
      .where(
        and(
          eq(variantListingPriceIndex.storeId, this.storeId),
          eq(variantListingPriceIndex.variantId, variantId)
        )
      )
      .returning({ variantId: variantListingPriceIndex.variantId });

    return rows.length;
  }

  async deleteByVariantIds(variantIds: readonly string[]): Promise<number> {
    if (variantIds.length === 0) {
      return 0;
    }

    let deleted = 0;
    for (const chunk of chunkArray([...new Set(variantIds)])) {
      const rows = await this.connection
        .delete(variantListingPriceIndex)
        .where(
          and(
            eq(variantListingPriceIndex.storeId, this.storeId),
            inArray(variantListingPriceIndex.variantId, chunk)
          )
        )
        .returning({ variantId: variantListingPriceIndex.variantId });

      deleted += rows.length;
    }

    return deleted;
  }

  async deleteByProductId(productId: string): Promise<number> {
    const variantIds = this.connection
      .select({ variantId: variantListingIndex.variantId })
      .from(variantListingIndex)
      .where(
        and(
          eq(variantListingIndex.storeId, this.storeId),
          eq(variantListingIndex.productId, productId)
        )
      );

    const rows = await this.connection
      .delete(variantListingPriceIndex)
      .where(
        and(
          eq(variantListingPriceIndex.storeId, this.storeId),
          inArray(variantListingPriceIndex.variantId, variantIds)
        )
      )
      .returning({ variantId: variantListingPriceIndex.variantId });

    return rows.length;
  }

  async deleteByProductIds(productIds: readonly string[]): Promise<number> {
    if (productIds.length === 0) {
      return 0;
    }

    let deleted = 0;
    for (const chunk of chunkArray([...new Set(productIds)])) {
      const variantIds = this.connection
        .select({ variantId: variantListingIndex.variantId })
        .from(variantListingIndex)
        .where(
          and(
            eq(variantListingIndex.storeId, this.storeId),
            inArray(variantListingIndex.productId, chunk)
          )
        );

      const rows = await this.connection
        .delete(variantListingPriceIndex)
        .where(
          and(
            eq(variantListingPriceIndex.storeId, this.storeId),
            inArray(variantListingPriceIndex.variantId, variantIds)
          )
        )
        .returning({ variantId: variantListingPriceIndex.variantId });

      deleted += rows.length;
    }

    return deleted;
  }

  @ReadOnly()
  async getPriceAggregatesByProductIds(
    productIds: readonly string[],
    currencies: readonly string[]
  ): Promise<Map<string, ProductListingPriceRowInput[]>> {
    const uniqueProductIds = [...new Set(productIds)];
    const uniqueCurrencies = [...new Set(currencies)];
    for (const currency of uniqueCurrencies) {
      assertCurrency(currency);
    }

    const result = new Map<string, ProductListingPriceRowInput[]>();
    for (const productId of uniqueProductIds) {
      result.set(
        productId,
        uniqueCurrencies.map((currency) => ({
          productId,
          currency,
          hasPrice: false,
          minPriceMinor: null,
          maxPriceMinor: null,
        }))
      );
    }

    if (uniqueProductIds.length === 0 || uniqueCurrencies.length === 0) {
      return result;
    }

    const rows = await this.connection
      .select({
        productId: variantListingIndex.productId,
        currency: variantListingPriceIndex.currency,
        minPriceMinor: sql<number>`min(${variantListingPriceIndex.priceMinor})::bigint`,
        maxPriceMinor: sql<number>`max(${variantListingPriceIndex.priceMinor})::bigint`,
      })
      .from(variantListingPriceIndex)
      .innerJoin(
        variantListingIndex,
        and(
          eq(variantListingIndex.storeId, variantListingPriceIndex.storeId),
          eq(variantListingIndex.variantId, variantListingPriceIndex.variantId)
        )
      )
      .where(
        and(
          eq(variantListingPriceIndex.storeId, this.storeId),
          eq(variantListingIndex.storeId, this.storeId),
          inArray(variantListingIndex.productId, uniqueProductIds),
          inArray(variantListingPriceIndex.currency, uniqueCurrencies),
          eq(variantListingPriceIndex.hasPrice, true)
        )
      )
      .groupBy(variantListingIndex.productId, variantListingPriceIndex.currency);

    for (const row of rows) {
      const productRows = result.get(row.productId);
      if (!productRows) {
        continue;
      }

      const target = productRows.find((item) => item.currency === row.currency);
      if (target && row.minPriceMinor != null && row.maxPriceMinor != null) {
        target.hasPrice = true;
        target.minPriceMinor = row.minPriceMinor;
        target.maxPriceMinor = row.maxPriceMinor;
      }
    }

    return result;
  }

  private toInsertRow(
    row: VariantListingPriceRowInput,
    now: string
  ): NewVariantListingPriceIndex {
    assertCurrency(row.currency);
    const variantDocId = normalizeDocId(row.variantDocId, "variantDocId");
    const productDocId = normalizeDocId(row.productDocId, "productDocId");
    const productId = normalizeString(row.productId, "productId");

    if (!row.hasPrice) {
      if (row.priceMinor != null) {
        throw new Error("hasPrice=false requires null variant price");
      }

      return {
        storeId: this.storeId,
        variantId: row.variantId,
        currency: row.currency,
        variantDocId,
        productDocId,
        productId,
        hasPrice: false,
        priceMinor: null,
        indexedAt: now,
        updatedAt: now,
      };
    }

    if (row.priceMinor == null) {
      throw new Error("hasPrice=true requires non-null variant price");
    }

    assertNonNegativeInteger(row.priceMinor, "priceMinor");

    return {
      storeId: this.storeId,
      variantId: row.variantId,
      currency: row.currency,
      variantDocId,
      productDocId,
      productId,
      hasPrice: true,
      priceMinor: row.priceMinor,
      indexedAt: now,
      updatedAt: now,
    };
  }
}

function normalizeDocId(value: number, label: string): number {
  assertPositiveDocId(value, label);
  return value;
}

function normalizeString(value: string, label: string): string {
  assertNonEmptyString(value, label);
  return value;
}
