import { and, count, eq, inArray, sql } from "drizzle-orm";
import { Transactional, ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  listingPostingVariantPrice,
  type ListingPostingVariantPrice,
  type NewListingPostingVariantPrice,
} from "../models/index.js";
import {
  assertCurrency,
  assertNonNegativeInteger,
  assertPositiveDocId,
  assertUniqueBy,
  chunkArray,
  type RuntimeVariantPriceRowInput,
} from "./listingRepositoryTypes.js";

export class ListingPostingVariantPriceRepository extends BaseRepository {
  @ReadOnly()
  async exists(currency: string, variantDocId: number): Promise<boolean> {
    assertCurrency(currency);
    assertPositiveDocId(variantDocId, "variantDocId");
    const rows = await this.connection
      .select({ variantDocId: listingPostingVariantPrice.variantDocId })
      .from(listingPostingVariantPrice)
      .where(
        and(
          eq(listingPostingVariantPrice.projectId, this.storeId),
          eq(listingPostingVariantPrice.currency, currency),
          eq(listingPostingVariantPrice.variantDocId, variantDocId)
        )
      )
      .limit(1);

    return rows.length > 0;
  }

  @ReadOnly()
  async find(
    currency: string,
    variantDocId: number
  ): Promise<ListingPostingVariantPrice | null> {
    assertCurrency(currency);
    assertPositiveDocId(variantDocId, "variantDocId");
    const rows = await this.connection
      .select()
      .from(listingPostingVariantPrice)
      .where(
        and(
          eq(listingPostingVariantPrice.projectId, this.storeId),
          eq(listingPostingVariantPrice.currency, currency),
          eq(listingPostingVariantPrice.variantDocId, variantDocId)
        )
      )
      .limit(1);

    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByVariantDocId(
    variantDocId: number
  ): Promise<ListingPostingVariantPrice[]> {
    assertPositiveDocId(variantDocId, "variantDocId");
    return this.connection
      .select()
      .from(listingPostingVariantPrice)
      .where(
        and(
          eq(listingPostingVariantPrice.projectId, this.storeId),
          eq(listingPostingVariantPrice.variantDocId, variantDocId)
        )
      );
  }

  @ReadOnly()
  async getByVariantDocIds(
    variantDocIds: readonly number[]
  ): Promise<ListingPostingVariantPrice[]> {
    if (variantDocIds.length === 0) {
      return [];
    }

    for (const variantDocId of variantDocIds) {
      assertPositiveDocId(variantDocId, "variantDocId");
    }

    return this.connection
      .select()
      .from(listingPostingVariantPrice)
      .where(
        and(
          eq(listingPostingVariantPrice.projectId, this.storeId),
          inArray(listingPostingVariantPrice.variantDocId, [
            ...new Set(variantDocIds),
          ])
        )
      );
  }

  @ReadOnly()
  async getByProductDocId(
    productDocId: number
  ): Promise<ListingPostingVariantPrice[]> {
    assertPositiveDocId(productDocId, "productDocId");
    return this.connection
      .select()
      .from(listingPostingVariantPrice)
      .where(
        and(
          eq(listingPostingVariantPrice.projectId, this.storeId),
          eq(listingPostingVariantPrice.productDocId, productDocId)
        )
      );
  }

  @ReadOnly()
  async getByProductDocIds(
    productDocIds: readonly number[]
  ): Promise<ListingPostingVariantPrice[]> {
    if (productDocIds.length === 0) {
      return [];
    }

    for (const productDocId of productDocIds) {
      assertPositiveDocId(productDocId, "productDocId");
    }

    return this.connection
      .select()
      .from(listingPostingVariantPrice)
      .where(
        and(
          eq(listingPostingVariantPrice.projectId, this.storeId),
          inArray(listingPostingVariantPrice.productDocId, [
            ...new Set(productDocIds),
          ])
        )
      );
  }

  @ReadOnly()
  async count(): Promise<number> {
    const rows = await this.connection
      .select({ value: count() })
      .from(listingPostingVariantPrice)
      .where(eq(listingPostingVariantPrice.projectId, this.storeId));

    return rows[0]?.value ?? 0;
  }

  async upsert(
    row: RuntimeVariantPriceRowInput
  ): Promise<ListingPostingVariantPrice> {
    const rows = await this.upsertMany([row]);
    return rows[0];
  }

  async upsertMany(
    rows: readonly RuntimeVariantPriceRowInput[]
  ): Promise<ListingPostingVariantPrice[]> {
    if (rows.length === 0) {
      return [];
    }

    assertUniqueBy(
      rows,
      (row) => `${row.currency}:${row.variantDocId}`,
      "runtime variant price row"
    );

    const result: ListingPostingVariantPrice[] = [];
    for (const chunk of chunkArray(rows)) {
      const values = chunk.map((row) => this.toInsertRow(row));
      const inserted = await this.connection
        .insert(listingPostingVariantPrice)
        .values(values)
        .onConflictDoUpdate({
          target: [
            listingPostingVariantPrice.projectId,
            listingPostingVariantPrice.currency,
            listingPostingVariantPrice.variantDocId,
          ],
          setWhere: eq(listingPostingVariantPrice.projectId, this.storeId),
          set: {
            productDocId: sql`excluded.product_doc_id`,
            productId: sql`excluded.product_id`,
            priceMinor: sql`excluded.price_minor`,
          },
        })
        .returning();

      result.push(...inserted);
    }

    return result;
  }

  @Transactional()
  async replaceForVariant(
    variantDocId: number,
    rows: readonly RuntimeVariantPriceRowInput[]
  ): Promise<ListingPostingVariantPrice[]> {
    assertPositiveDocId(variantDocId, "variantDocId");
    for (const row of rows) {
      if (row.variantDocId !== variantDocId) {
        throw new Error("Runtime price row variantDocId must match replace key");
      }
    }

    await this.deleteByVariantDocId(variantDocId);
    return this.upsertMany(rows);
  }

  @Transactional()
  async replaceForVariants(
    rowsByVariantDocId: ReadonlyMap<number, readonly RuntimeVariantPriceRowInput[]>
  ): Promise<ListingPostingVariantPrice[]> {
    if (rowsByVariantDocId.size === 0) {
      return [];
    }

    const variantDocIds = [...rowsByVariantDocId.keys()];
    for (const variantDocId of variantDocIds) {
      assertPositiveDocId(variantDocId, "variantDocId");
    }

    const rows = [...rowsByVariantDocId.entries()].flatMap(
      ([variantDocId, variantRows]) => {
        for (const row of variantRows) {
          if (row.variantDocId !== variantDocId) {
            throw new Error("Runtime price row variantDocId must match map key");
          }
        }
        return [...variantRows];
      }
    );

    await this.deleteByVariantDocIds(variantDocIds);
    return this.upsertMany(rows);
  }

  @Transactional()
  async replaceForProductDocId(
    productDocId: number,
    rows: readonly RuntimeVariantPriceRowInput[]
  ): Promise<ListingPostingVariantPrice[]> {
    assertPositiveDocId(productDocId, "productDocId");
    for (const row of rows) {
      if (row.productDocId !== productDocId) {
        throw new Error("Runtime price row productDocId must match replace key");
      }
    }

    await this.deleteByProductDocId(productDocId);
    return this.upsertMany(rows);
  }

  async delete(currency: string, variantDocId: number): Promise<boolean> {
    assertCurrency(currency);
    assertPositiveDocId(variantDocId, "variantDocId");
    const rows = await this.connection
      .delete(listingPostingVariantPrice)
      .where(
        and(
          eq(listingPostingVariantPrice.projectId, this.storeId),
          eq(listingPostingVariantPrice.currency, currency),
          eq(listingPostingVariantPrice.variantDocId, variantDocId)
        )
      )
      .returning({ variantDocId: listingPostingVariantPrice.variantDocId });

    return rows.length > 0;
  }

  async deleteByVariantDocId(variantDocId: number): Promise<number> {
    assertPositiveDocId(variantDocId, "variantDocId");
    const rows = await this.connection
      .delete(listingPostingVariantPrice)
      .where(
        and(
          eq(listingPostingVariantPrice.projectId, this.storeId),
          eq(listingPostingVariantPrice.variantDocId, variantDocId)
        )
      )
      .returning({ variantDocId: listingPostingVariantPrice.variantDocId });

    return rows.length;
  }

  async deleteByVariantDocIds(variantDocIds: readonly number[]): Promise<number> {
    if (variantDocIds.length === 0) {
      return 0;
    }

    for (const variantDocId of variantDocIds) {
      assertPositiveDocId(variantDocId, "variantDocId");
    }

    let deleted = 0;
    for (const chunk of chunkArray([...new Set(variantDocIds)])) {
      const rows = await this.connection
        .delete(listingPostingVariantPrice)
        .where(
          and(
            eq(listingPostingVariantPrice.projectId, this.storeId),
            inArray(listingPostingVariantPrice.variantDocId, chunk)
          )
        )
        .returning({ variantDocId: listingPostingVariantPrice.variantDocId });

      deleted += rows.length;
    }

    return deleted;
  }

  async deleteByProductDocId(productDocId: number): Promise<number> {
    assertPositiveDocId(productDocId, "productDocId");
    const rows = await this.connection
      .delete(listingPostingVariantPrice)
      .where(
        and(
          eq(listingPostingVariantPrice.projectId, this.storeId),
          eq(listingPostingVariantPrice.productDocId, productDocId)
        )
      )
      .returning({ productDocId: listingPostingVariantPrice.productDocId });

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
        .delete(listingPostingVariantPrice)
        .where(
          and(
            eq(listingPostingVariantPrice.projectId, this.storeId),
            inArray(listingPostingVariantPrice.productDocId, chunk)
          )
        )
        .returning({ productDocId: listingPostingVariantPrice.productDocId });

      deleted += rows.length;
    }

    return deleted;
  }

  async deleteAllForCurrentProject(): Promise<number> {
    const rows = await this.connection
      .delete(listingPostingVariantPrice)
      .where(eq(listingPostingVariantPrice.projectId, this.storeId))
      .returning({ variantDocId: listingPostingVariantPrice.variantDocId });

    return rows.length;
  }

  private toInsertRow(
    row: RuntimeVariantPriceRowInput
  ): NewListingPostingVariantPrice {
    assertCurrency(row.currency);
    assertPositiveDocId(row.variantDocId, "variantDocId");
    assertPositiveDocId(row.productDocId, "productDocId");
    assertNonNegativeInteger(row.priceMinor, "priceMinor");

    return {
      projectId: this.storeId,
      currency: row.currency,
      variantDocId: row.variantDocId,
      productDocId: row.productDocId,
      productId: row.productId,
      priceMinor: row.priceMinor,
    };
  }
}
