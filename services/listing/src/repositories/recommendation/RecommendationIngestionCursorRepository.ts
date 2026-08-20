import { ReadOnly } from "@shopana/shared-kernel";
import { eq, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  recommendationIngestionCursor,
  type RecommendationIngestionCursor,
} from "../models/recommendationRuntime.js";

export class RecommendationIngestionCursorRepository extends BaseRepository {
  async lockOrCreate(): Promise<RecommendationIngestionCursor> {
    const cursorId = await this.generateUuidV7();
    await this.connection.execute(sql`
      INSERT INTO listing.recommendation_ingestion_cursor (
        cursor_id, store_id, last_position, updated_at
      ) VALUES (${cursorId}::uuid, ${this.storeId}::uuid, 0, now())
      ON CONFLICT (store_id) DO NOTHING
    `);
    const rows = await this.connection.execute<RecommendationIngestionCursor>(sql`
      SELECT cursor_id AS "cursorId", store_id AS "storeId",
        last_position AS "lastPosition", updated_at AS "updatedAt"
      FROM listing.recommendation_ingestion_cursor
      WHERE store_id = ${this.storeId}::uuid
      FOR UPDATE
    `);
    const row = rows[0];
    if (!row) throw new Error("Recommendation ingestion cursor is missing");
    return row;
  }

  async advance(cursorId: string, expected: bigint): Promise<bigint> {
    const next = expected + 1n;
    const rows = await this.connection.execute<{ lastPosition: bigint }>(sql`
      UPDATE listing.recommendation_ingestion_cursor
      SET last_position = ${next}, updated_at = now()
      WHERE cursor_id = ${cursorId}::uuid
        AND store_id = ${this.storeId}::uuid
        AND last_position = ${expected}
      RETURNING last_position AS "lastPosition"
    `);
    if (rows[0]?.lastPosition !== next) {
      throw new Error("Recommendation ingestion cursor advance conflict");
    }
    return next;
  }

  @ReadOnly()
  async find(): Promise<RecommendationIngestionCursor | null> {
    const [row] = await this.connection
      .select()
      .from(recommendationIngestionCursor)
      .where(eq(recommendationIngestionCursor.storeId, this.storeId))
      .limit(1);
    return row ?? null;
  }
}
