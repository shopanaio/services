import { ReadOnly } from "@shopana/shared-kernel";
import { and, eq, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  recommendationOrderFact,
  recommendationOrderProductFact,
  type RecommendationOrderFact,
} from "../models/recommendationRuntime.js";

export interface RecommendationOrderFactWrite {
  eventId: string;
  ingestionPosition: bigint;
  orderId: string;
  state: "COMMITTED" | "REVERSED";
  orderRevision: number;
  committedAt: string;
  occurredAt: string;
  payloadHash: string;
  lines: readonly { productId: string; quantity: number }[];
}

export class RecommendationOrderFactRepository extends BaseRepository {
  @ReadOnly()
  async findByEventId(eventId: string): Promise<RecommendationOrderFact | null> {
    const [row] = await this.connection
      .select()
      .from(recommendationOrderFact)
      .where(
        and(
          eq(recommendationOrderFact.storeId, this.storeId),
          eq(recommendationOrderFact.eventId, eventId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  @ReadOnly()
  async findByOrderRevision(
    orderId: string,
    orderRevision: number,
  ): Promise<RecommendationOrderFact | null> {
    const [row] = await this.connection
      .select()
      .from(recommendationOrderFact)
      .where(
        and(
          eq(recommendationOrderFact.storeId, this.storeId),
          eq(recommendationOrderFact.orderId, orderId),
          eq(recommendationOrderFact.orderRevision, orderRevision),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  @ReadOnly()
  async findGenerationCommittedAt(orderId: string): Promise<string | null> {
    const rows = await this.connection.execute<{ committedAt: string }>(sql`
      SELECT committed_at AS "committedAt"
      FROM listing.recommendation_order_fact
      WHERE store_id = ${this.storeId}::uuid
        AND order_id = ${orderId}::uuid
      ORDER BY order_revision ASC, ingestion_position ASC
      LIMIT 1
    `);
    return rows[0]?.committedAt ?? null;
  }

  async insert(input: RecommendationOrderFactWrite): Promise<RecommendationOrderFact> {
    const [orderFactId, ...productFactIds] = await this.generateUuidV7s(
      input.lines.length + 1,
    );
    if (!orderFactId) throw new Error("Order fact UUID was not generated");
    const [row] = await this.connection
      .insert(recommendationOrderFact)
      .values({
        orderFactId,
        eventId: input.eventId,
        ingestionPosition: input.ingestionPosition,
        storeId: this.storeId,
        orderId: input.orderId,
        state: input.state,
        orderRevision: input.orderRevision,
        committedAt: input.committedAt,
        occurredAt: input.occurredAt,
        payloadHash: input.payloadHash,
        ingestedAt: sql`now()`,
      })
      .returning();
    if (!row) throw new Error("Recommendation order fact insert returned no row");

    if (input.lines.length > 0) {
      await this.connection.insert(recommendationOrderProductFact).values(
        input.lines.map((line, index) => ({
          orderProductFactId: productFactIds[index]!,
          orderFactId,
          productId: line.productId,
          quantity: line.quantity,
          createdAt: sql`now()`,
        })),
      );
    }
    return row;
  }

  @ReadOnly()
  async hasClosedWindowChanges(input: {
    afterWatermark: bigint;
    windowEndedAt: string;
  }): Promise<boolean> {
    const rows = await this.connection.execute<{ exists: boolean }>(sql`
      SELECT EXISTS (
        SELECT 1
        FROM listing.recommendation_order_fact
        WHERE store_id = ${this.storeId}::uuid
          AND ingestion_position > ${input.afterWatermark}
          AND committed_at < ${input.windowEndedAt}::timestamptz
      ) AS "exists"
    `);
    return rows[0]?.exists ?? false;
  }
}
