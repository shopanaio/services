import { and, eq, inArray } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  variantSearchIndex,
  type VariantSearchIndex,
  type NewVariantSearchIndex,
} from "../models/index.js";

export interface UpsertVariantSearchIndexInput {
  variantId: string;
  productId: string;
  priceCurrency: string;
  priceMinor: number | null;
  inStock: boolean;
  totalStock: number;
  optionSlugs: string[];
  createdAt?: string;
}

export class VariantSearchIndexRepository extends BaseRepository {
  async findByVariantId(variantId: string): Promise<VariantSearchIndex | null> {
    const rows = await this.connection
      .select()
      .from(variantSearchIndex)
      .where(
        and(
          eq(variantSearchIndex.projectId, this.storeId),
          eq(variantSearchIndex.variantId, variantId)
        )
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async getByVariantIds(variantIds: readonly string[]): Promise<VariantSearchIndex[]> {
    if (variantIds.length === 0) {
      return [];
    }

    return this.connection
      .select()
      .from(variantSearchIndex)
      .where(
        and(
          eq(variantSearchIndex.projectId, this.storeId),
          inArray(variantSearchIndex.variantId, [...variantIds])
        )
      );
  }

  async getByProductIds(productIds: readonly string[]): Promise<VariantSearchIndex[]> {
    if (productIds.length === 0) {
      return [];
    }

    return this.connection
      .select()
      .from(variantSearchIndex)
      .where(
        and(
          eq(variantSearchIndex.projectId, this.storeId),
          inArray(variantSearchIndex.productId, [...productIds])
        )
      );
  }

  async upsert(input: UpsertVariantSearchIndexInput): Promise<VariantSearchIndex> {
    const now = new Date().toISOString();
    const values: NewVariantSearchIndex = {
      projectId: this.storeId,
      variantId: input.variantId,
      productId: input.productId,
      priceCurrency: input.priceCurrency,
      priceMinor: input.priceMinor,
      inStock: input.inStock,
      totalStock: input.totalStock,
      optionSlugs: input.optionSlugs,
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    };

    const result = await this.connection
      .insert(variantSearchIndex)
      .values(values)
      .onConflictDoUpdate({
        target: variantSearchIndex.variantId,
        set: {
          productId: values.productId,
          priceCurrency: values.priceCurrency,
          priceMinor: values.priceMinor,
          inStock: values.inStock,
          totalStock: values.totalStock,
          optionSlugs: values.optionSlugs,
          updatedAt: values.updatedAt,
        },
      })
      .returning();

    return result[0];
  }

  async delete(variantId: string): Promise<void> {
    await this.connection
      .delete(variantSearchIndex)
      .where(
        and(
          eq(variantSearchIndex.projectId, this.storeId),
          eq(variantSearchIndex.variantId, variantId)
        )
      );
  }

  async deleteByProductId(productId: string): Promise<void> {
    await this.connection
      .delete(variantSearchIndex)
      .where(
        and(
          eq(variantSearchIndex.projectId, this.storeId),
          eq(variantSearchIndex.productId, productId)
        )
      );
  }
}
