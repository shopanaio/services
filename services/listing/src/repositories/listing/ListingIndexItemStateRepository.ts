import { and, eq, or, sql } from "drizzle-orm";
import { ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  listingIndexItemState,
  type ListingIndexItemState,
  type NewListingIndexItemState,
} from "../models/index.js";
import { assertUniqueBy, chunkArray } from "./listingRepositoryTypes.js";

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

  async lockByItems(
    keys: readonly ListingIndexItemStateKey[]
  ): Promise<Map<string, ListingIndexItemStateRow>> {
    if (keys.length === 0) {
      return new Map();
    }

    assertUniqueBy(
      keys,
      (key) => this.mapKey(key),
      "listing index item state key"
    );
    const orderedKeys = [...keys].sort(compareItemStateKeys);

    for (const key of orderedKeys) {
      await this.connection.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${this.lockKey(key)}, 0))`
      );
    }

    const result = new Map<string, ListingIndexItemStateRow>();
    for (const chunk of chunkArray(orderedKeys)) {
      const rows = await this.connection
        .select()
        .from(listingIndexItemState)
        .where(or(...chunk.map((key) => this.whereItemKey(key))))
        .for("update");

      for (const row of rows) {
        result.set(this.mapKey(row), row as ListingIndexItemStateRow);
      }
    }

    return result;
  }

  async upsertLatestState(
    row: ListingIndexItemStateRow
  ): Promise<ListingIndexItemStateRow> {
    const rows = await this.upsertLatestStates([row]);

    return rows[0] as ListingIndexItemStateRow;
  }

  async upsertLatestStates(
    rows: readonly ListingIndexItemStateRow[]
  ): Promise<ListingIndexItemStateRow[]> {
    if (rows.length === 0) {
      return [];
    }

    assertUniqueBy(
      rows,
      (row) => this.mapKey(row),
      "listing index item state row"
    );
    const result: ListingIndexItemStateRow[] = [];

    for (const chunk of chunkArray(rows)) {
      const values: NewListingIndexItemState[] = chunk.map((row) => row);
      const upserted = await this.connection
        .insert(listingIndexItemState)
        .values(values)
        .onConflictDoUpdate({
          target: [listingIndexItemState.storeId, listingIndexItemState.itemId],
          set: {
            sourceSequence: sql`excluded.source_sequence`,
            payloadHash: sql`excluded.payload_hash`,
            lifecycleStatus: sql`excluded.lifecycle_status`,
            lastEffectiveIdempotencyKey: sql`excluded.last_effective_idempotency_key`,
            lastOperationId: sql`excluded.last_operation_id`,
            updatedAt: sql`excluded.updated_at`,
          },
        })
        .returning();

      result.push(...(upserted as ListingIndexItemStateRow[]));
    }

    return result;
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

  private mapKey(key: ListingIndexItemStateKey): string {
    return `${key.storeId}:${key.itemId}`;
  }
}

function compareItemStateKeys(
  left: ListingIndexItemStateKey,
  right: ListingIndexItemStateKey
): number {
  return (
    left.storeId.localeCompare(right.storeId) ||
    left.itemId.localeCompare(right.itemId)
  );
}
