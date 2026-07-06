import { and, eq, sql } from "drizzle-orm";
import { ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  listingIndexItemState,
  type ListingIndexItemState,
  type NewListingIndexItemState,
} from "../models/index.js";

export interface ListingIndexItemStateKey {
  storeId: string;
  itemId: string;
}

export type ListingIndexItemStateRow = ListingIndexItemState & {
  lifecycleStatus: "indexed" | "deleted";
};

export class ListingIndexItemStateRepository extends BaseRepository {
  @ReadOnly()
  async findByItem(
    key: ListingIndexItemStateKey
  ): Promise<ListingIndexItemStateRow | null> {
    const rows = await this.connection
      .select()
      .from(listingIndexItemState)
      .where(this.whereItemKey(key))
      .limit(1);

    return (rows[0] as ListingIndexItemStateRow | undefined) ?? null;
  }

  async lockByItem(
    key: ListingIndexItemStateKey
  ): Promise<ListingIndexItemStateRow | null> {
    await this.connection.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${this.lockKey(key)}, 0))`
    );

    const rows = await this.connection
      .select()
      .from(listingIndexItemState)
      .where(this.whereItemKey(key))
      .limit(1)
      .for("update");

    return (rows[0] as ListingIndexItemStateRow | undefined) ?? null;
  }

  async upsertLatestState(
    row: ListingIndexItemStateRow
  ): Promise<ListingIndexItemStateRow> {
    const values: NewListingIndexItemState = row;
    const rows = await this.connection
      .insert(listingIndexItemState)
      .values(values)
      .onConflictDoUpdate({
        target: [listingIndexItemState.storeId, listingIndexItemState.itemId],
        set: {
          sourceSequence: row.sourceSequence,
          payloadHash: row.payloadHash,
          lifecycleStatus: row.lifecycleStatus,
          lastEffectiveIdempotencyKey: row.lastEffectiveIdempotencyKey,
          lastOperationId: row.lastOperationId,
          updatedAt: row.updatedAt,
        },
      })
      .returning();

    return rows[0] as ListingIndexItemStateRow;
  }

  private whereItemKey(key: ListingIndexItemStateKey) {
    return and(
      eq(listingIndexItemState.storeId, key.storeId),
      eq(listingIndexItemState.itemId, key.itemId)
    );
  }

  private lockKey(key: ListingIndexItemStateKey): string {
    return `listing_index_item_state:v1:${key.storeId}:${key.itemId}`;
  }
}
