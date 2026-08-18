import { rawSql, singleOrNull, type SQLExecutor } from "@event-driven-io/dumbo";
import { dumboPool } from "../db/dumbo.js";
import { knex } from "../db/knex.js";

export type CheckoutPlacementStatus =
  | "CLAIMED"
  | "RESOURCES_RESERVED"
  | "ORDER_CREATED"
  | "PAYMENT_CREATED"
  | "PLACED"
  | "FAILED";

export interface CheckoutPlacementFailure {
  code: string;
  message: string;
  retryable: boolean;
}

export interface CheckoutCompensationFailure {
  operation: string;
  message: string;
  recordedAt: string;
}

export interface CheckoutPlacementRecord<TResult = unknown> {
  placementId: string;
  storeId: string;
  checkoutId: string;
  checkoutVersion: number;
  resultRevision: string;
  idempotencyKey: string;
  requestHash: string;
  credentialId: string;
  workflowId: string;
  status: CheckoutPlacementStatus;
  discountReservationIds: readonly string[];
  loyaltyReservation: unknown | null;
  requestedOrderId: string | null;
  orderId: string | null;
  paymentCollectionId: string | null;
  paymentSessionId: string | null;
  paymentOperationId: string | null;
  compensationFailures: readonly CheckoutCompensationFailure[];
  failure: CheckoutPlacementFailure | null;
  result: TResult | null;
  createdAt: string;
  updatedAt: string;
}

type PlacementRow = {
  id: string;
  store_id: string;
  checkout_id: string;
  checkout_version: number;
  result_revision: string;
  idempotency_key: string;
  request_hash: string;
  credential_id: string;
  workflow_id: string;
  status: CheckoutPlacementStatus;
  discount_reservation_ids: string[];
  loyalty_reservation: unknown | null;
  requested_order_id: string | null;
  order_id: string | null;
  payment_collection_id: string | null;
  payment_session_id: string | null;
  payment_operation_id: string | null;
  compensation_failures: CheckoutCompensationFailure[];
  failure: CheckoutPlacementFailure | null;
  result: unknown | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export class CheckoutPlacementRepository {
  constructor(private readonly execute: SQLExecutor = dumboPool.execute) {}

  async claim(input: {
    storeId: string;
    checkoutId: string;
    checkoutVersion: number;
    resultRevision: string;
    idempotencyKey: string;
    requestHash: string;
    credentialId: string;
    workflowId: string;
  }): Promise<CheckoutPlacementRecord> {
    const insert = knex.raw(
      `WITH checkout_to_place AS MATERIALIZED (
         SELECT id
           FROM checkout.checkouts
          WHERE store_id = ? AND id = ? AND version = ? AND result_revision = ?
            AND status = 'READY' AND expires_at > CURRENT_TIMESTAMP
          FOR UPDATE
       )
       INSERT INTO checkout.checkout_placements (
         store_id, checkout_id, checkout_version, result_revision,
         idempotency_key, request_hash, credential_id, workflow_id
       )
       SELECT ?, ?, ?, ?, ?, ?, ?, ?
       FROM checkout_to_place
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [
        input.storeId,
        input.checkoutId,
        input.checkoutVersion,
        input.resultRevision,
        input.storeId,
        input.checkoutId,
        input.checkoutVersion,
        input.resultRevision,
        input.idempotencyKey,
        input.requestHash,
        input.credentialId,
        input.workflowId,
      ],
    ).toString();
    const inserted = await singleOrNull(
      this.execute.query<PlacementRow>(rawSql(insert)),
    );
    if (inserted) return mapPlacement(inserted);

    const existing = await this.findByCheckout(input.storeId, input.checkoutId);
    if (!existing) {
      const idempotencyConflict = await this.findByIdempotencyKey(
        input.storeId,
        input.idempotencyKey,
      );
      if (idempotencyConflict) {
        throw new Error("IDEMPOTENCY_KEY_PARAMETER_MISMATCH");
      }
      throw new Error("CHECKOUT_PLACEMENT_SNAPSHOT_STALE");
    }
    if (
      existing.idempotencyKey === input.idempotencyKey &&
      (
        existing.requestHash !== input.requestHash ||
        existing.checkoutVersion !== input.checkoutVersion ||
        existing.resultRevision !== input.resultRevision
      )
    ) {
      throw new Error("IDEMPOTENCY_KEY_PARAMETER_MISMATCH");
    }
    if (
      existing.idempotencyKey !== input.idempotencyKey ||
      existing.requestHash !== input.requestHash
    ) {
      throw new Error("CHECKOUT_ALREADY_PLACED");
    }
    if (existing.workflowId !== input.workflowId) {
      throw new Error("CHECKOUT_PLACEMENT_WORKFLOW_MISMATCH");
    }
    if (existing.status === "FAILED") {
      throw new Error("CHECKOUT_PLACEMENT_FAILED");
    }
    return existing;
  }

  async complete<TResult>(
    placementId: string,
    result: TResult,
  ): Promise<CheckoutPlacementRecord<TResult>> {
    const query = knex
      .withSchema("checkout")
      .table("checkout_placements")
      .update({
        status: "PLACED",
        result: knex.raw("?::jsonb", [JSON.stringify(result)]),
        updated_at: knex.fn.now(),
      })
      .whereIn("status", ["ORDER_CREATED", "PAYMENT_CREATED"])
      .where({ id: placementId })
      .returning("*")
      .toString();
    const updated = await singleOrNull(
      this.execute.query<PlacementRow>(rawSql(query)),
    );
    if (updated) {
      await this.setCheckoutLifecycle(updated.store_id, updated.checkout_id, "PLACED");
      return mapPlacement(updated) as CheckoutPlacementRecord<TResult>;
    }

    const existing = await this.findById<TResult>(placementId);
    if (existing?.status === "PLACED") {
      await this.setCheckoutLifecycle(existing.storeId, existing.checkoutId, "PLACED");
      return existing;
    }
    throw new Error("CHECKOUT_PLACEMENT_COMPLETION_CONFLICT");
  }

  async transition(
    placementId: string,
    input:
      | {
          from: "CLAIMED";
          to: "RESOURCES_RESERVED";
          discountReservationIds: readonly string[];
          loyaltyReservation: unknown | null;
          requestedOrderId: string;
        }
      | { from: "RESOURCES_RESERVED"; to: "ORDER_CREATED"; orderId: string }
      | {
          from: "ORDER_CREATED";
          to: "PAYMENT_CREATED";
          paymentCollectionId: string;
          paymentSessionId: string;
          paymentOperationId: string;
        },
  ): Promise<CheckoutPlacementRecord> {
    const values: Record<string, unknown> = {
      status: input.to,
      updated_at: knex.fn.now(),
    };
    if (input.to === "RESOURCES_RESERVED") {
      values.discount_reservation_ids = knex.raw("?::jsonb", [
        JSON.stringify(input.discountReservationIds),
      ]);
      values.loyalty_reservation = input.loyaltyReservation === null
        ? null
        : knex.raw("?::jsonb", [JSON.stringify(input.loyaltyReservation)]);
      values.requested_order_id = input.requestedOrderId;
    } else if (input.to === "ORDER_CREATED") {
      values.order_id = input.orderId;
    } else {
      values.payment_collection_id = input.paymentCollectionId;
      values.payment_session_id = input.paymentSessionId;
      values.payment_operation_id = input.paymentOperationId;
    }
    const query = knex
      .withSchema("checkout")
      .table("checkout_placements")
      .update(values)
      .where({ id: placementId, status: input.from })
      .returning("*")
      .toString();
    const updated = await singleOrNull(this.execute.query<PlacementRow>(rawSql(query)));
    if (updated) return mapPlacement(updated);
    const existing = await this.findById(placementId);
    if (existing?.status === input.to) return existing;
    throw new Error("CHECKOUT_PLACEMENT_TRANSITION_CONFLICT");
  }

  async fail(
    placementId: string,
    failure: CheckoutPlacementFailure,
    compensationFailures: readonly CheckoutCompensationFailure[],
  ): Promise<void> {
    const query = knex
      .withSchema("checkout")
      .table("checkout_placements")
      .update({
        status: "FAILED",
        failure: knex.raw("?::jsonb", [JSON.stringify(failure)]),
        compensation_failures: knex.raw("?::jsonb", [
          JSON.stringify(compensationFailures),
        ]),
        updated_at: knex.fn.now(),
      })
      .where({ id: placementId })
      .whereNotIn("status", ["PLACED", "FAILED"])
      .returning("*")
      .toString();
    const updated = await singleOrNull(
      this.execute.query<PlacementRow>(rawSql(query)),
    );
    if (updated) {
      await this.setCheckoutLifecycle(updated.store_id, updated.checkout_id, "ABANDONED");
      return;
    }

    const existing = await this.findById(placementId);
    if (existing?.status === "FAILED") {
      await this.setCheckoutLifecycle(existing.storeId, existing.checkoutId, "ABANDONED");
      return;
    }
    throw new Error("CHECKOUT_PLACEMENT_FAILURE_CONFLICT");
  }

  async recordCompensationFailures(
    placementId: string,
    failures: readonly CheckoutCompensationFailure[],
  ): Promise<void> {
    if (failures.length === 0) return;
    const query = knex.raw(
      `UPDATE checkout.checkout_placements
          SET compensation_failures = compensation_failures || ?::jsonb,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [JSON.stringify(failures), placementId],
    ).toString();
    await this.execute.query(rawSql(query));
  }

  async replaceResult<TResult>(
    placementId: string,
    result: TResult,
  ): Promise<CheckoutPlacementRecord<TResult>> {
    const query = knex
      .withSchema("checkout")
      .table("checkout_placements")
      .update({
        result: knex.raw("?::jsonb", [JSON.stringify(result)]),
        updated_at: knex.fn.now(),
      })
      .where({ id: placementId, status: "PLACED" })
      .returning("*")
      .toString();
    const updated = await singleOrNull(
      this.execute.query<PlacementRow>(rawSql(query)),
    );
    if (updated) return mapPlacement(updated) as CheckoutPlacementRecord<TResult>;

    const existing = await this.findById<TResult>(placementId);
    if (existing?.status === "PLACED") return existing;
    throw new Error("CHECKOUT_PLACEMENT_RESULT_UPDATE_CONFLICT");
  }

  async countStuck(olderThanSeconds: number): Promise<number> {
    const query = knex.raw(
      `SELECT count(*)::int AS count
         FROM checkout.checkout_placements
        WHERE status IN ('CLAIMED', 'RESOURCES_RESERVED', 'ORDER_CREATED', 'PAYMENT_CREATED')
          AND updated_at < CURRENT_TIMESTAMP - (? * interval '1 second')`,
      [olderThanSeconds],
    ).toString();
    const row = await singleOrNull(
      this.execute.query<{ count: number }>(rawSql(query)),
    );
    return Number(row?.count ?? 0);
  }

  async listStuck(
    olderThanSeconds: number,
    limit = 100,
  ): Promise<CheckoutPlacementRecord[]> {
    const query = knex.raw(
      `SELECT * FROM checkout.checkout_placements
        WHERE status IN ('CLAIMED', 'RESOURCES_RESERVED', 'ORDER_CREATED', 'PAYMENT_CREATED')
          AND updated_at < CURRENT_TIMESTAMP - (? * interval '1 second')
        ORDER BY updated_at
        LIMIT ?`,
      [olderThanSeconds, limit],
    ).toString();
    const rows = await this.execute.query<PlacementRow>(rawSql(query));
    return rows.rows.map(mapPlacement);
  }

  async operationalMetrics(): Promise<{
    stuckPlacements: number;
    paymentMonitorLagSeconds: number;
    unresolvedCompensationFailures: number;
  }> {
    const query = `SELECT
      count(*) FILTER (
        WHERE status IN ('CLAIMED', 'RESOURCES_RESERVED', 'ORDER_CREATED', 'PAYMENT_CREATED')
          AND updated_at < CURRENT_TIMESTAMP - interval '5 minutes'
      )::int AS stuck,
      COALESCE(max(extract(epoch FROM (CURRENT_TIMESTAMP - updated_at))) FILTER (
        WHERE status = 'PAYMENT_CREATED'
      ), 0)::double precision AS payment_lag,
      COALESCE(sum(jsonb_array_length(compensation_failures)), 0)::int AS compensation_failures
    FROM checkout.checkout_placements`;
    const row = await singleOrNull(this.execute.query<{
      stuck: number;
      payment_lag: number;
      compensation_failures: number;
    }>(rawSql(query)));
    return {
      stuckPlacements: Number(row?.stuck ?? 0),
      paymentMonitorLagSeconds: Number(row?.payment_lag ?? 0),
      unresolvedCompensationFailures: Number(row?.compensation_failures ?? 0),
    };
  }

  private async setCheckoutLifecycle(
    storeId: string,
    checkoutId: string,
    status: "PLACED" | "ABANDONED",
  ): Promise<void> {
    const query = knex
      .withSchema("checkout")
      .table("checkouts")
      .update({ status, updated_at: knex.fn.now() })
      .where({ id: checkoutId, store_id: storeId })
      .toString();
    await this.execute.query(rawSql(query));
  }

  async findById<TResult = unknown>(
    placementId: string,
  ): Promise<CheckoutPlacementRecord<TResult> | null> {
    const query = knex
      .withSchema("checkout")
      .table("checkout_placements")
      .select("*")
      .where({ id: placementId })
      .limit(1)
      .toString();
    const row = await singleOrNull(
      this.execute.query<PlacementRow>(rawSql(query)),
    );
    return row ? mapPlacement(row) as CheckoutPlacementRecord<TResult> : null;
  }

  async findByIdForStorefrontCredential<TResult = unknown>(
    input: {
      placementId: string;
      storeId: string;
      credentialId: string;
    },
  ): Promise<CheckoutPlacementRecord<TResult> | null> {
    const query = knex
      .withSchema("checkout")
      .table("checkout_placements")
      .select("*")
      .where({
        id: input.placementId,
        store_id: input.storeId,
        credential_id: input.credentialId,
      })
      .limit(1)
      .toString();
    const row = await singleOrNull(
      this.execute.query<PlacementRow>(rawSql(query)),
    );
    return row ? mapPlacement(row) as CheckoutPlacementRecord<TResult> : null;
  }

  private async findByCheckout(
    storeId: string,
    checkoutId: string,
  ): Promise<CheckoutPlacementRecord | null> {
    const query = knex
      .withSchema("checkout")
      .table("checkout_placements")
      .select("*")
      .where({ store_id: storeId, checkout_id: checkoutId })
      .limit(1)
      .toString();
    const row = await singleOrNull(
      this.execute.query<PlacementRow>(rawSql(query)),
    );
    return row ? mapPlacement(row) : null;
  }

  private async findByIdempotencyKey(
    storeId: string,
    idempotencyKey: string,
  ): Promise<CheckoutPlacementRecord | null> {
    const query = knex
      .withSchema("checkout")
      .table("checkout_placements")
      .select("*")
      .where({ store_id: storeId, idempotency_key: idempotencyKey })
      .limit(1)
      .toString();
    const row = await singleOrNull(
      this.execute.query<PlacementRow>(rawSql(query)),
    );
    return row ? mapPlacement(row) : null;
  }
}

function mapPlacement(row: PlacementRow): CheckoutPlacementRecord {
  return {
    placementId: row.id,
    storeId: row.store_id,
    checkoutId: row.checkout_id,
    checkoutVersion: row.checkout_version,
    resultRevision: row.result_revision,
    idempotencyKey: row.idempotency_key,
    requestHash: row.request_hash,
    credentialId: row.credential_id,
    workflowId: row.workflow_id,
    status: row.status,
    discountReservationIds: row.discount_reservation_ids,
    loyaltyReservation: row.loyalty_reservation,
    requestedOrderId: row.requested_order_id,
    orderId: row.order_id,
    paymentCollectionId: row.payment_collection_id,
    paymentSessionId: row.payment_session_id,
    paymentOperationId: row.payment_operation_id,
    compensationFailures: row.compensation_failures,
    failure: row.failure,
    result: row.result,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
