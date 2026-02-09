import { and, asc, count, eq, inArray } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  collectionItem,
  type CollectionItem,
  type NewCollectionItem,
} from "../models/index.js";
import { initialRank, nextRank, rebalanceRanks } from "../../scripts/shared/rank.js";

export class CollectionItemRepository extends BaseRepository {
  async findByCollectionId(collectionId: string): Promise<CollectionItem[]> {
    return this.connection
      .select()
      .from(collectionItem)
      .where(
        and(
          eq(collectionItem.projectId, this.storeId),
          eq(collectionItem.collectionId, collectionId)
        )
      )
      .orderBy(asc(collectionItem.lexoRank), asc(collectionItem.productId));
  }

  async countByCollectionId(collectionId: string): Promise<number> {
    const result = await this.connection
      .select({ count: count() })
      .from(collectionItem)
      .where(
        and(
          eq(collectionItem.projectId, this.storeId),
          eq(collectionItem.collectionId, collectionId)
        )
      );
    return result[0]?.count ?? 0;
  }

  async findByCollectionAndProduct(
    collectionId: string,
    productId: string
  ): Promise<CollectionItem | null> {
    const rows = await this.connection
      .select()
      .from(collectionItem)
      .where(
        and(
          eq(collectionItem.projectId, this.storeId),
          eq(collectionItem.collectionId, collectionId),
          eq(collectionItem.productId, productId)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async addProducts(collectionId: string, productIds: string[]): Promise<void> {
    if (productIds.length === 0) return;

    let rank = await this.getNextRank(collectionId);
    const rows: NewCollectionItem[] = [];

    for (const productId of productIds) {
      rows.push({
        collectionId,
        productId,
        projectId: this.storeId,
        lexoRank: rank,
        createdAt: new Date().toISOString(),
      });
      rank = nextRank(rank);
    }

    await this.connection
      .insert(collectionItem)
      .values(rows)
      .onConflictDoNothing();
  }

  async removeProducts(collectionId: string, productIds: string[]): Promise<void> {
    if (productIds.length === 0) return;
    await this.connection
      .delete(collectionItem)
      .where(
        and(
          eq(collectionItem.projectId, this.storeId),
          eq(collectionItem.collectionId, collectionId),
          inArray(collectionItem.productId, productIds)
        )
      );
  }

  async updateRank(
    collectionId: string,
    productId: string,
    lexoRank: string
  ): Promise<CollectionItem | null> {
    const rows = await this.connection
      .update(collectionItem)
      .set({ lexoRank })
      .where(
        and(
          eq(collectionItem.projectId, this.storeId),
          eq(collectionItem.collectionId, collectionId),
          eq(collectionItem.productId, productId)
        )
      )
      .returning();
    return rows[0] ?? null;
  }

  async rebalance(collectionId: string): Promise<void> {
    const items = await this.findByCollectionId(collectionId);
    const ranks = rebalanceRanks(items.length);
    for (let i = 0; i < items.length; i++) {
      await this.updateRank(collectionId, items[i].productId, ranks[i]);
    }
  }

  private async getNextRank(collectionId: string): Promise<string> {
    const rows = await this.connection
      .select({ lexoRank: collectionItem.lexoRank })
      .from(collectionItem)
      .where(
        and(
          eq(collectionItem.projectId, this.storeId),
          eq(collectionItem.collectionId, collectionId)
        )
      )
      .orderBy(asc(collectionItem.lexoRank));

    if (rows.length === 0) {
      return initialRank();
    }

    return nextRank(rows[rows.length - 1].lexoRank);
  }
}
