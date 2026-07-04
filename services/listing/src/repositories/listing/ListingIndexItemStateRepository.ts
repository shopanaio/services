import { and, eq, sql } from "drizzle-orm";
import { ReadOnly } from "@shopana/shared-kernel";
import type { Listing } from "@shopana/broker-types";
import { BaseRepository } from "../BaseRepository.js";
import {
  listingIndexItemState,
  type ListingIndexItemState,
  type NewListingIndexItemState,
} from "../models/index.js";

export interface ListingIndexItemStateKey {
  projectId: string;
  entityType: Listing.ListingSellableItemEntityType;
  itemId: string;
}

export type ListingIndexItemStateRow = ListingIndexItemState & {
  entityType: Listing.ListingSellableItemEntityType;
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
        target: [
          listingIndexItemState.projectId,
          listingIndexItemState.entityType,
          listingIndexItemState.itemId,
        ],
        set: {
          sourceRevision: row.sourceRevision,
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
      eq(listingIndexItemState.projectId, key.projectId),
      eq(listingIndexItemState.entityType, key.entityType),
      eq(listingIndexItemState.itemId, key.itemId)
    );
  }

  private lockKey(key: ListingIndexItemStateKey): string {
    return `listing_index_item_state:v1:${key.projectId}:${key.entityType}:${key.itemId}`;
  }
}
