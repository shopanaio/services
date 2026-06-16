import { and, eq, inArray } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  productSearchIndex,
  type ProductSearchIndex,
  type NewProductSearchIndex,
} from "../models/index.js";

export interface UpsertProductSearchIndexInput {
  productId: string;
  status: "published" | "draft";
  tagHandles: string[];
  featureSlugs: string[];
  categoryHandles: string[];
  createdAt?: string;
}

export class SearchIndexRepository extends BaseRepository {
  async findByProductId(productId: string): Promise<ProductSearchIndex | null> {
    const rows = await this.connection
      .select()
      .from(productSearchIndex)
      .where(
        and(
          eq(productSearchIndex.projectId, this.storeId),
          eq(productSearchIndex.productId, productId)
        )
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async getByProductIds(productIds: readonly string[]): Promise<ProductSearchIndex[]> {
    if (productIds.length === 0) {
      return [];
    }

    return this.connection
      .select()
      .from(productSearchIndex)
      .where(
        and(
          eq(productSearchIndex.projectId, this.storeId),
          inArray(productSearchIndex.productId, [...productIds])
        )
      );
  }

  async upsert(input: UpsertProductSearchIndexInput): Promise<ProductSearchIndex> {
    const now = new Date().toISOString();
    const values: NewProductSearchIndex = {
      projectId: this.storeId,
      productId: input.productId,
      status: input.status,
      tagHandles: input.tagHandles,
      featureSlugs: input.featureSlugs,
      categoryHandles: input.categoryHandles,
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    };

    const result = await this.connection
      .insert(productSearchIndex)
      .values(values)
      .onConflictDoUpdate({
        target: productSearchIndex.productId,
        set: {
          status: values.status,
          tagHandles: values.tagHandles,
          featureSlugs: values.featureSlugs,
          categoryHandles: values.categoryHandles,
          updatedAt: values.updatedAt,
        },
      })
      .returning();

    return result[0];
  }

  async delete(productId: string): Promise<void> {
    await this.connection
      .delete(productSearchIndex)
      .where(
        and(
          eq(productSearchIndex.projectId, this.storeId),
          eq(productSearchIndex.productId, productId)
        )
      );
  }
}
