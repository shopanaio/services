import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  collectionItem,
  collectionProductSyncItem,
  collectionProductSyncOperation,
  collectionMutationReceipt,
  type CollectionMutationReceipt,
  type CollectionProductSyncOperation,
} from "../models/index.js";

export type CollectionProductSyncReason =
  | "add"
  | "remove"
  | "move"
  | "rebalance"
  | "clear";

export interface CollectionSyncConsistencyIssue {
  code:
    | "INVALID_RECEIPT_HASH"
    | "PENDING_WITHOUT_ITEMS"
    | "SYNC_COUNT_MISMATCH"
    | "COMPLETED_WITH_PENDING_ITEMS"
    | "STALE_PENDING_OPERATION";
  operationId?: string;
  workflowId?: string;
  message: string;
}

export interface CollectionBulkSyncOperationResult {
  operationId: string | null;
  affectedCount: number;
}

export class CollectionSyncRepository extends BaseRepository {
  async auditConsistency(
    limit = 100,
    offset = 0,
  ): Promise<CollectionSyncConsistencyIssue[]> {
    const boundedLimit = Number.isSafeInteger(limit)
      ? Math.max(1, Math.min(limit, 1_000))
      : 100;
    const boundedOffset =
      Number.isSafeInteger(offset) && offset > 0 ? offset : 0;
    return this.connection.execute<CollectionSyncConsistencyIssue>(sql`
      WITH item_counts AS (
        SELECT
          operation_id,
          COUNT(*)::int AS total_count,
          COUNT(*) FILTER (WHERE emitted_at IS NULL)::int AS pending_count
        FROM catalog.collection_product_sync_item
        WHERE store_id = ${this.storeId}::uuid
        GROUP BY operation_id
      ),
      issues AS (
        SELECT
          'INVALID_RECEIPT_HASH'::text AS code,
          NULL::text AS "operationId",
          r.workflow_id AS "workflowId",
          'Mutation receipt request hash is not canonical SHA-256'::text AS message
        FROM catalog.collection_mutation_receipt r
        WHERE r.store_id = ${this.storeId}::uuid
          AND r.request_hash !~ '^sha256:v1:[0-9a-f]{64}$'

        UNION ALL

        SELECT
          CASE
            WHEN o.status = 'pending' AND COALESCE(c.pending_count, 0) = 0
              THEN 'PENDING_WITHOUT_ITEMS'
            WHEN o.affected_count <> o.emitted_count + COALESCE(c.pending_count, 0)
              THEN 'SYNC_COUNT_MISMATCH'
            WHEN o.status = 'completed' AND COALESCE(c.pending_count, 0) > 0
              THEN 'COMPLETED_WITH_PENDING_ITEMS'
            WHEN o.status = 'pending' AND o.created_at < now() - interval '15 minutes'
              THEN 'STALE_PENDING_OPERATION'
          END AS code,
          o.operation_id::text AS "operationId",
          o.workflow_id AS "workflowId",
          CASE
            WHEN o.status = 'pending' AND COALESCE(c.pending_count, 0) = 0
              THEN 'Pending sync operation has no pending items'
            WHEN o.affected_count <> o.emitted_count + COALESCE(c.pending_count, 0)
              THEN 'Sync operation counts are inconsistent'
            WHEN o.status = 'completed' AND COALESCE(c.pending_count, 0) > 0
              THEN 'Completed sync operation still has pending items'
            ELSE 'Pending sync operation is older than 15 minutes'
          END AS message
        FROM catalog.collection_product_sync_operation o
        LEFT JOIN item_counts c ON c.operation_id = o.operation_id
        WHERE o.store_id = ${this.storeId}::uuid
          AND (
            (o.status = 'pending' AND COALESCE(c.pending_count, 0) = 0)
            OR o.affected_count <> o.emitted_count + COALESCE(c.pending_count, 0)
            OR (o.status = 'completed' AND COALESCE(c.pending_count, 0) > 0)
            OR (
              o.status = 'pending'
              AND o.created_at < now() - interval '15 minutes'
            )
          )
      )
      SELECT code, "operationId", "workflowId", message
      FROM issues
      WHERE code IS NOT NULL
      ORDER BY code, "workflowId"
      LIMIT ${boundedLimit}
      OFFSET ${boundedOffset}
    `);
  }

  async findMutationReceipt(
    workflowId: string,
  ): Promise<CollectionMutationReceipt | null> {
    const rows = await this.connection
      .select()
      .from(collectionMutationReceipt)
      .where(
        and(
          eq(collectionMutationReceipt.storeId, this.storeId),
          eq(collectionMutationReceipt.workflowId, workflowId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async saveMutationReceipt(input: {
    workflowId: string;
    requestHash: string;
    mutationKind: string;
    result: unknown;
  }): Promise<void> {
    await this.connection.insert(collectionMutationReceipt).values({
      storeId: this.storeId,
      workflowId: input.workflowId,
      requestHash: input.requestHash,
      mutationKind: input.mutationKind,
      resultJson: input.result,
      completedAt: new Date().toISOString(),
    });
  }

  async createOperation(input: {
    workflowId: string;
    collectionId: string;
    collectionRevision: number;
    reason: CollectionProductSyncReason;
    productIds: readonly string[];
  }): Promise<CollectionProductSyncOperation> {
    const operationId = await this.generateUuidV7();
    const productIds = [...new Set(input.productIds)].sort();
    const completed = productIds.length === 0;
    const rows = await this.connection
      .insert(collectionProductSyncOperation)
      .values({
        storeId: this.storeId,
        operationId,
        workflowId: input.workflowId,
        collectionId: input.collectionId,
        collectionRevision: input.collectionRevision,
        reason: input.reason,
        status: completed ? "completed" : "pending",
        affectedCount: productIds.length,
        emittedCount: 0,
        completedAt: completed ? new Date().toISOString() : null,
      })
      .returning();
    const operation = rows[0];
    if (!operation) throw new Error("Collection sync operation was not created");

    if (productIds.length > 0) {
      await this.connection.insert(collectionProductSyncItem).values(
        productIds.map((productId) => ({
          storeId: this.storeId,
          operationId,
          productId,
          emittedAt: null,
        })),
      );
    }
    return operation;
  }

  async clearCollection(input: {
    workflowId: string;
    collectionId: string;
    collectionRevision: number;
  }): Promise<CollectionBulkSyncOperationResult> {
    const operationId = await this.generateUuidV7();
    const rows = await this.connection.execute<{
      operationId: string | null;
      affectedCount: number | string;
    }>(sql`
      WITH affected AS MATERIALIZED (
        DELETE FROM ${collectionItem}
        WHERE store_id = ${this.storeId}::uuid
          AND collection_id = ${input.collectionId}::uuid
        RETURNING product_id
      ),
      counts AS MATERIALIZED (
        SELECT COUNT(*)::integer AS affected_count
        FROM affected
      ),
      operation AS (
        INSERT INTO ${collectionProductSyncOperation} (
          store_id,
          operation_id,
          workflow_id,
          collection_id,
          collection_revision,
          reason,
          status,
          affected_count,
          emitted_count
        )
        SELECT
          ${this.storeId}::uuid,
          ${operationId}::uuid,
          ${input.workflowId},
          ${input.collectionId}::uuid,
          ${input.collectionRevision},
          'clear',
          'pending',
          counts.affected_count,
          0
        FROM counts
        WHERE counts.affected_count > 0
        RETURNING operation_id
      ),
      sync_items AS (
        INSERT INTO ${collectionProductSyncItem} (
          store_id,
          operation_id,
          product_id,
          emitted_at
        )
        SELECT
          ${this.storeId}::uuid,
          operation.operation_id,
          affected.product_id,
          NULL
        FROM affected
        CROSS JOIN operation
        RETURNING product_id
      )
      SELECT
        operation.operation_id::text AS "operationId",
        counts.affected_count AS "affectedCount"
      FROM counts
      LEFT JOIN operation ON true
    `);
    return mapBulkOperationResult(rows[0]);
  }

  async rebalanceCollection(input: {
    workflowId: string;
    collectionId: string;
    collectionRevision: number;
  }): Promise<CollectionBulkSyncOperationResult> {
    const operationId = await this.generateUuidV7();
    const rows = await this.connection.execute<{
      operationId: string | null;
      affectedCount: number | string;
    }>(sql`
      WITH ordered AS MATERIALIZED (
        SELECT
          product_id,
          row_number() OVER (ORDER BY lexo_rank ASC, product_id ASC) AS ordinal,
          count(*) OVER () AS total
        FROM ${collectionItem}
        WHERE store_id = ${this.storeId}::uuid
          AND collection_id = ${input.collectionId}::uuid
      ),
      ranked AS MATERIALIZED (
        SELECT
          product_id,
          lpad(
            (
              floor(
                (power(10::numeric, 20) - 1) / (total + 1)
              ) * ordinal
            )::numeric::text,
            20,
            '0'
          ) AS next_rank
        FROM ordered
      ),
      affected AS MATERIALIZED (
        UPDATE ${collectionItem} AS item
        SET lexo_rank = ranked.next_rank
        FROM ranked
        WHERE item.store_id = ${this.storeId}::uuid
          AND item.collection_id = ${input.collectionId}::uuid
          AND item.product_id = ranked.product_id
          AND item.lexo_rank <> ranked.next_rank
        RETURNING item.product_id
      ),
      counts AS MATERIALIZED (
        SELECT COUNT(*)::integer AS affected_count
        FROM affected
      ),
      operation AS (
        INSERT INTO ${collectionProductSyncOperation} (
          store_id,
          operation_id,
          workflow_id,
          collection_id,
          collection_revision,
          reason,
          status,
          affected_count,
          emitted_count
        )
        SELECT
          ${this.storeId}::uuid,
          ${operationId}::uuid,
          ${input.workflowId},
          ${input.collectionId}::uuid,
          ${input.collectionRevision},
          'rebalance',
          'pending',
          counts.affected_count,
          0
        FROM counts
        WHERE counts.affected_count > 0
        RETURNING operation_id
      ),
      sync_items AS (
        INSERT INTO ${collectionProductSyncItem} (
          store_id,
          operation_id,
          product_id,
          emitted_at
        )
        SELECT
          ${this.storeId}::uuid,
          operation.operation_id,
          affected.product_id,
          NULL
        FROM affected
        CROSS JOIN operation
        RETURNING product_id
      )
      SELECT
        operation.operation_id::text AS "operationId",
        counts.affected_count AS "affectedCount"
      FROM counts
      LEFT JOIN operation ON true
    `);
    return mapBulkOperationResult(rows[0]);
  }

  async findByWorkflowId(
    workflowId: string,
  ): Promise<CollectionProductSyncOperation | null> {
    const rows = await this.connection
      .select()
      .from(collectionProductSyncOperation)
      .where(
        and(
          eq(collectionProductSyncOperation.storeId, this.storeId),
          eq(collectionProductSyncOperation.workflowId, workflowId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async getPendingProductIds(
    operationId: string,
    afterProductId: string | null,
    limit: number,
  ): Promise<string[]> {
    const rows = await this.connection
      .select({ productId: collectionProductSyncItem.productId })
      .from(collectionProductSyncItem)
      .where(
        and(
          eq(collectionProductSyncItem.storeId, this.storeId),
          eq(collectionProductSyncItem.operationId, operationId),
          isNull(collectionProductSyncItem.emittedAt),
          afterProductId
            ? sql`${collectionProductSyncItem.productId} > ${afterProductId}`
            : sql`true`,
        ),
      )
      .orderBy(asc(collectionProductSyncItem.productId))
      .limit(limit);
    return rows.map((row) => row.productId);
  }

  async markEmitted(
    operationId: string,
    productIds: readonly string[],
  ): Promise<void> {
    if (productIds.length === 0) return;
    const now = new Date().toISOString();
    const rows = await this.connection
      .update(collectionProductSyncItem)
      .set({ emittedAt: now })
      .where(
        and(
          eq(collectionProductSyncItem.storeId, this.storeId),
          eq(collectionProductSyncItem.operationId, operationId),
          inArray(collectionProductSyncItem.productId, [...productIds]),
          isNull(collectionProductSyncItem.emittedAt),
        ),
      )
      .returning({ productId: collectionProductSyncItem.productId });
    if (rows.length === 0) return;

    await this.connection
      .update(collectionProductSyncOperation)
      .set({
        emittedCount: sql`${collectionProductSyncOperation.emittedCount} + ${rows.length}`,
      })
      .where(
        and(
          eq(collectionProductSyncOperation.storeId, this.storeId),
          eq(collectionProductSyncOperation.operationId, operationId),
        ),
      );
  }

  async completeIfDrained(operationId: string): Promise<boolean> {
    const pending = await this.connection
      .select({ productId: collectionProductSyncItem.productId })
      .from(collectionProductSyncItem)
      .where(
        and(
          eq(collectionProductSyncItem.storeId, this.storeId),
          eq(collectionProductSyncItem.operationId, operationId),
          isNull(collectionProductSyncItem.emittedAt),
        ),
      )
      .limit(1);
    if (pending.length > 0) return false;
    await this.connection
      .update(collectionProductSyncOperation)
      .set({ status: "completed", completedAt: new Date().toISOString() })
      .where(
        and(
          eq(collectionProductSyncOperation.storeId, this.storeId),
          eq(collectionProductSyncOperation.operationId, operationId),
        ),
      );
    return true;
  }
}

function mapBulkOperationResult(
  row:
    | { operationId: string | null; affectedCount: number | string }
    | undefined,
): CollectionBulkSyncOperationResult {
  if (!row) throw new Error("Collection bulk sync operation returned no row");
  const affectedCount = Number(row.affectedCount);
  if (!Number.isSafeInteger(affectedCount) || affectedCount < 0) {
    throw new Error("Collection bulk sync operation returned an invalid count");
  }
  if (affectedCount > 0 && !row.operationId) {
    throw new Error("Collection bulk sync operation was not created");
  }
  return { operationId: row.operationId, affectedCount };
}
