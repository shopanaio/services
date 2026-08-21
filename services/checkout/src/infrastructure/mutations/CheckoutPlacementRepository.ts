import { rawSql, singleOrNull, type SQLExecutor } from "@event-driven-io/dumbo";
import { dumboPool } from "../db/dumbo.js";
import { knex } from "../db/knex.js";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { CheckoutDatabase } from "../db/CheckoutTransactionKernel.js";

export type CheckoutPlacementStatus =
  "CLAIMED" | "RESOURCES_RESERVED" | "ORDER_CREATED" | "PAYMENT_CREATED" | "PLACED" | "FAILED";

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
  idempotencyKey: string;
  requestHash: string;
  credentialId: string;
  workflowId: string;
  requestInput: unknown;
  status: CheckoutPlacementStatus;
  discountReservationIds: readonly string[];
  discountRedemptionIds: readonly string[];
  deliveryGroupIds: readonly string[];
  loyaltyReservation: unknown | null;
  requestedOrderId: string | null;
  orderId: string | null;
  paymentCollectionId: string | null;
  paymentSessionId: string | null;
  paymentOperationId: string | null;
  paymentMonitorInput: unknown | null;
  paymentMonitorWorkflowId: string | null;
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
  idempotency_key: string;
  request_hash: string;
  credential_id: string;
  workflow_id: string;
  request_input: unknown;
  status: CheckoutPlacementStatus;
  discount_reservation_ids: string[];
  discount_redemption_ids: string[];
  delivery_group_ids: string[];
  loyalty_reservation: unknown | null;
  requested_order_id: string | null;
  order_id: string | null;
  payment_collection_id: string | null;
  payment_session_id: string | null;
  payment_operation_id: string | null;
  payment_monitor_input: unknown | null;
  payment_monitor_workflow_id: string | null;
  compensation_failures: CheckoutCompensationFailure[];
  failure: CheckoutPlacementFailure | null;
  result: unknown | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export class CheckoutPlacementRepository {
  constructor(
    private readonly execute: SQLExecutor = dumboPool.execute,
    readonly txManager?: TransactionManager<CheckoutDatabase, SQLExecutor>,
  ) {}

  private get connection(): SQLExecutor {
    return this.txManager?.getConnection() ?? this.execute;
  }

  async claim(input: {
    storeId: string;
    checkoutId: string;
    idempotencyKey: string;
    requestHash: string;
    credentialId: string;
    workflowId: string;
    visitorId: string;
    requestInput: unknown;
    recoveryOfWorkflowId?: string;
  }): Promise<CheckoutPlacementRecord> {
    const insert = knex
      .raw(
        `WITH checkout_to_place AS MATERIALIZED (
         SELECT id
           FROM checkout.checkouts
          WHERE store_id = ? AND id = ? AND owner_visitor_id = ?
            AND status = 'READY' AND expires_at > CURRENT_TIMESTAMP
          FOR UPDATE
       )
       INSERT INTO checkout.checkout_placements (
         store_id, checkout_id,
         idempotency_key, request_hash, credential_id, workflow_id, request_input
       )
       SELECT ?, ?, ?, ?, ?, ?, ?::jsonb
       FROM checkout_to_place
       ON CONFLICT DO NOTHING
       RETURNING *`,
        [
          input.storeId,
          input.checkoutId,
          input.visitorId,
          input.storeId,
          input.checkoutId,
          input.idempotencyKey,
          input.requestHash,
          input.credentialId,
          input.workflowId,
          JSON.stringify(input.requestInput),
        ],
      )
      .toString();
    const inserted = await singleOrNull(this.connection.query<PlacementRow>(rawSql(insert)));
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
      existing.requestHash !== input.requestHash
    ) {
      throw new Error("IDEMPOTENCY_KEY_PARAMETER_MISMATCH");
    }
    if (
      existing.idempotencyKey !== input.idempotencyKey ||
      existing.requestHash !== input.requestHash
    ) {
      throw new Error("CHECKOUT_ALREADY_PLACED");
    }
    if (existing.status === "FAILED") {
      throw new Error("CHECKOUT_PLACEMENT_FAILED");
    }
    if (existing.workflowId !== input.workflowId) {
      if (input.recoveryOfWorkflowId !== existing.workflowId) {
        throw new Error("CHECKOUT_PLACEMENT_WORKFLOW_MISMATCH");
      }
      return this.takeOverWorkflow(existing.placementId, existing.workflowId, input.workflowId);
    }
    return existing;
  }

  private async takeOverWorkflow(
    placementId: string,
    previousWorkflowId: string,
    workflowId: string,
  ): Promise<CheckoutPlacementRecord> {
    const query = knex
      .withSchema("checkout")
      .table("checkout_placements")
      .update({ workflow_id: workflowId, updated_at: knex.fn.now() })
      .where({ id: placementId, workflow_id: previousWorkflowId })
      .whereIn("status", ["CLAIMED", "RESOURCES_RESERVED", "ORDER_CREATED", "PAYMENT_CREATED"])
      .returning("*")
      .toString();
    const updated = await singleOrNull(this.connection.query<PlacementRow>(rawSql(query)));
    if (updated) return mapPlacement(updated);
    const existing = await this.findById(placementId);
    if (existing?.workflowId === workflowId) return existing;
    throw new Error("CHECKOUT_PLACEMENT_RECOVERY_CONFLICT");
  }

  async prepareOrderId(placementId: string, requestedOrderId: string): Promise<string> {
    const query = knex
      .withSchema("checkout")
      .table("checkout_placements")
      .update({ requested_order_id: requestedOrderId, updated_at: knex.fn.now() })
      .where({ id: placementId, status: "CLAIMED" })
      .whereNull("requested_order_id")
      .returning("requested_order_id")
      .toString();
    const updated = await singleOrNull(
      this.connection.query<{ requested_order_id: string }>(rawSql(query)),
    );
    if (updated) return updated.requested_order_id;
    const existing = await this.findById(placementId);
    if (existing?.requestedOrderId) return existing.requestedOrderId;
    throw new Error("CHECKOUT_PLACEMENT_ORDER_ID_CONFLICT");
  }

  async recordDiscountReservations(
    placementId: string,
    reservationIds: readonly string[],
  ): Promise<void> {
    await this.recordClaimedJsonResource(
      placementId,
      "discount_reservation_ids",
      reservationIds,
      "CHECKOUT_PLACEMENT_DISCOUNT_RESERVATIONS_CONFLICT",
    );
  }

  async recordLoyaltyReservation(placementId: string, reservation: unknown): Promise<void> {
    await this.recordClaimedJsonResource(
      placementId,
      "loyalty_reservation",
      reservation,
      "CHECKOUT_PLACEMENT_LOYALTY_RESERVATION_CONFLICT",
    );
  }

  async recordDiscountRedemptions(
    placementId: string,
    redemptionIds: readonly string[],
  ): Promise<void> {
    await this.recordClaimedJsonResource(
      placementId,
      "discount_redemption_ids",
      redemptionIds,
      "CHECKOUT_PLACEMENT_DISCOUNT_REDEMPTIONS_CONFLICT",
    );
  }

  async recordDeliveryCommitments(placementId: string, groupIds: readonly string[]): Promise<void> {
    await this.recordClaimedJsonResource(
      placementId,
      "delivery_group_ids",
      groupIds,
      "CHECKOUT_PLACEMENT_DELIVERY_COMMITMENTS_CONFLICT",
    );
  }

  async complete<TResult>(
    placementId: string,
    result: TResult,
    checkoutLifecycleStatus: "PLACED" | "ABANDONED",
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
    const updated = await singleOrNull(this.connection.query<PlacementRow>(rawSql(query)));
    if (updated) {
      await this.setCheckoutLifecycle(
        updated.store_id,
        updated.checkout_id,
        checkoutLifecycleStatus,
      );
      return mapPlacement(updated) as CheckoutPlacementRecord<TResult>;
    }

    const existing = await this.findById<TResult>(placementId);
    if (existing?.status === "PLACED") {
      await this.setCheckoutLifecycle(
        existing.storeId,
        existing.checkoutId,
        checkoutLifecycleStatus,
      );
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
          discountRedemptionIds: readonly string[];
        }
      | { from: "RESOURCES_RESERVED"; to: "ORDER_CREATED"; orderId: string }
      | {
          from: "ORDER_CREATED";
          to: "PAYMENT_CREATED";
          paymentCollectionId: string;
          paymentSessionId: string;
          paymentOperationId: string;
          paymentMonitorInput: unknown;
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
      values.loyalty_reservation =
        input.loyaltyReservation === null
          ? null
          : knex.raw("?::jsonb", [JSON.stringify(input.loyaltyReservation)]);
      values.requested_order_id = input.requestedOrderId;
      values.discount_redemption_ids = knex.raw("?::jsonb", [
        JSON.stringify(input.discountRedemptionIds),
      ]);
    } else if (input.to === "ORDER_CREATED") {
      values.order_id = input.orderId;
    } else {
      values.payment_collection_id = input.paymentCollectionId;
      values.payment_session_id = input.paymentSessionId;
      values.payment_operation_id = input.paymentOperationId;
      values.payment_monitor_input = knex.raw("?::jsonb", [
        JSON.stringify(input.paymentMonitorInput),
      ]);
    }
    const query = knex
      .withSchema("checkout")
      .table("checkout_placements")
      .update(values)
      .where({ id: placementId, status: input.from })
      .returning("*")
      .toString();
    const updated = await singleOrNull(this.connection.query<PlacementRow>(rawSql(query)));
    if (updated) return mapPlacement(updated);
    const existing = await this.findById(placementId);
    if (existing && hasReachedPlacementState(existing.status, input.to)) {
      if (!placementMatchesTransition(existing, input)) {
        throw new Error("CHECKOUT_PLACEMENT_TRANSITION_MISMATCH");
      }
      return existing;
    }
    throw new Error("CHECKOUT_PLACEMENT_TRANSITION_CONFLICT");
  }

  async markPaymentMonitorStarted(
    placementId: string,
    workflowId: string,
    previousWorkflowId?: string,
  ): Promise<void> {
    const query = knex
      .withSchema("checkout")
      .table("checkout_placements")
      .update({ payment_monitor_workflow_id: workflowId, updated_at: knex.fn.now() })
      .where({ id: placementId })
      .whereIn("status", ["PAYMENT_CREATED", "PLACED"])
      .where((builder) =>
        builder
          .whereNull("payment_monitor_workflow_id")
          .orWhereIn("payment_monitor_workflow_id", [
            workflowId,
            ...(previousWorkflowId ? [previousWorkflowId] : []),
          ]),
      )
      .returning("id")
      .toString();
    const updated = await singleOrNull(this.connection.query<{ id: string }>(rawSql(query)));
    if (!updated) throw new Error("CHECKOUT_PAYMENT_MONITOR_TRANSITION_CONFLICT");
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
        compensation_failures: knex.raw("?::jsonb", [JSON.stringify(compensationFailures)]),
        updated_at: knex.fn.now(),
      })
      .where({ id: placementId })
      .whereNotIn("status", ["PLACED", "FAILED"])
      .returning("*")
      .toString();
    const updated = await singleOrNull(this.connection.query<PlacementRow>(rawSql(query)));
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
    const query = knex
      .raw(
        `UPDATE checkout.checkout_placements
          SET compensation_failures = compensation_failures || ?::jsonb,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [JSON.stringify(failures), placementId],
      )
      .toString();
    await this.connection.query(rawSql(query));
  }

  async replaceResult<TResult>(
    placementId: string,
    result: TResult,
    checkoutLifecycleStatus: "PLACED" | "ABANDONED",
  ): Promise<CheckoutPlacementRecord<TResult>> {
    const query = knex
      .withSchema("checkout")
      .table("checkout_placements")
      .update({
        status: "PLACED",
        result: knex.raw("?::jsonb", [JSON.stringify(result)]),
        updated_at: knex.fn.now(),
      })
      .where({ id: placementId })
      .whereIn("status", ["PAYMENT_CREATED", "PLACED"])
      .returning("*")
      .toString();
    const updated = await singleOrNull(this.connection.query<PlacementRow>(rawSql(query)));
    if (updated) {
      await this.setCheckoutLifecycle(
        updated.store_id,
        updated.checkout_id,
        checkoutLifecycleStatus,
      );
      return mapPlacement(updated) as CheckoutPlacementRecord<TResult>;
    }

    const existing = await this.findById<TResult>(placementId);
    if (existing?.status === "PLACED") {
      await this.setCheckoutLifecycle(
        existing.storeId,
        existing.checkoutId,
        checkoutLifecycleStatus,
      );
      return existing;
    }
    throw new Error("CHECKOUT_PLACEMENT_RESULT_UPDATE_CONFLICT");
  }

  async countStuck(olderThanSeconds: number): Promise<number> {
    const query = knex
      .raw(
        `SELECT count(*)::int AS count
         FROM checkout.checkout_placements
        WHERE status IN ('CLAIMED', 'RESOURCES_RESERVED', 'ORDER_CREATED', 'PAYMENT_CREATED')
          AND updated_at < CURRENT_TIMESTAMP - (? * interval '1 second')`,
        [olderThanSeconds],
      )
      .toString();
    const row = await singleOrNull(this.connection.query<{ count: number }>(rawSql(query)));
    return Number(row?.count ?? 0);
  }

  async listStuck(olderThanSeconds: number, limit = 100): Promise<CheckoutPlacementRecord[]> {
    const query = knex
      .raw(
        `SELECT * FROM checkout.checkout_placements
        WHERE status IN ('CLAIMED', 'RESOURCES_RESERVED', 'ORDER_CREATED', 'PAYMENT_CREATED')
          AND updated_at < CURRENT_TIMESTAMP - (? * interval '1 second')
        ORDER BY updated_at
        LIMIT ?`,
        [olderThanSeconds, limit],
      )
      .toString();
    const rows = await this.connection.query<PlacementRow>(rawSql(query));
    return rows.rows.map(mapPlacement);
  }

  async listPendingPaymentMonitors(limit = 100): Promise<CheckoutPlacementRecord[]> {
    const query = knex
      .raw(
        `SELECT * FROM checkout.checkout_placements
        WHERE status = 'PLACED'
          AND payment_monitor_input IS NOT NULL
          AND payment_monitor_workflow_id IS NOT NULL
          AND result->>'status' IN ('REQUIRES_ACTION', 'REQUIRES_CONFIRMATION', 'PAYMENT_PENDING')
        ORDER BY updated_at
        LIMIT ?`,
        [limit],
      )
      .toString();
    const rows = await this.connection.query<PlacementRow>(rawSql(query));
    return rows.rows.map(mapPlacement);
  }

  async listUnresolvedCompensations(limit = 100): Promise<CheckoutPlacementRecord[]> {
    const query = knex
      .raw(
        `SELECT * FROM checkout.checkout_placements
        WHERE jsonb_array_length(compensation_failures) > 0
        ORDER BY updated_at
        LIMIT ?`,
        [limit],
      )
      .toString();
    const rows = await this.connection.query<PlacementRow>(rawSql(query));
    return rows.rows.map(mapPlacement);
  }

  async clearCompensationFailures(placementId: string): Promise<void> {
    const query = knex
      .withSchema("checkout")
      .table("checkout_placements")
      .update({ compensation_failures: knex.raw("'[]'::jsonb"), updated_at: knex.fn.now() })
      .where({ id: placementId })
      .returning("id")
      .toString();
    const updated = await singleOrNull(this.connection.query<{ id: string }>(rawSql(query)));
    if (!updated) throw new Error("CHECKOUT_COMPENSATION_PLACEMENT_NOT_FOUND");
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
    const row = await singleOrNull(
      this.connection.query<{
        stuck: number;
        payment_lag: number;
        compensation_failures: number;
      }>(rawSql(query)),
    );
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
    await this.connection.query(rawSql(query));
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
    const row = await singleOrNull(this.connection.query<PlacementRow>(rawSql(query)));
    return row ? (mapPlacement(row) as CheckoutPlacementRecord<TResult>) : null;
  }

  async findByIdForStorefrontCredential<TResult = unknown>(input: {
    placementId: string;
    storeId: string;
    credentialId: string;
    visitorId: string;
  }): Promise<CheckoutPlacementRecord<TResult> | null> {
    const query = knex
      .withSchema("checkout")
      .table("checkout_placements")
      .innerJoin("checkout.checkouts", function () {
        this.on("checkouts.id", "=", "checkout_placements.checkout_id").andOn(
          "checkouts.store_id",
          "=",
          "checkout_placements.store_id",
        );
      })
      .select("checkout_placements.*")
      .where({
        "checkout_placements.id": input.placementId,
        "checkout_placements.store_id": input.storeId,
        "checkout_placements.credential_id": input.credentialId,
        "checkouts.owner_visitor_id": input.visitorId,
      })
      .limit(1)
      .toString();
    const row = await singleOrNull(this.connection.query<PlacementRow>(rawSql(query)));
    return row ? (mapPlacement(row) as CheckoutPlacementRecord<TResult>) : null;
  }

  async findByCheckoutForStorefrontOwner<TResult = unknown>(input: {
    checkoutId: string;
    storeId: string;
    credentialId: string;
    visitorId: string;
  }): Promise<CheckoutPlacementRecord<TResult> | null> {
    const query = knex
      .withSchema("checkout")
      .table("checkout_placements")
      .innerJoin("checkout.checkouts", function () {
        this.on("checkouts.id", "=", "checkout_placements.checkout_id").andOn(
          "checkouts.store_id",
          "=",
          "checkout_placements.store_id",
        );
      })
      .select("checkout_placements.*")
      .where({
        "checkout_placements.checkout_id": input.checkoutId,
        "checkout_placements.store_id": input.storeId,
        "checkout_placements.credential_id": input.credentialId,
        "checkouts.owner_visitor_id": input.visitorId,
      })
      .limit(1)
      .toString();
    const row = await singleOrNull(this.connection.query<PlacementRow>(rawSql(query)));
    return row ? (mapPlacement(row) as CheckoutPlacementRecord<TResult>) : null;
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
    const row = await singleOrNull(this.connection.query<PlacementRow>(rawSql(query)));
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
    const row = await singleOrNull(this.connection.query<PlacementRow>(rawSql(query)));
    return row ? mapPlacement(row) : null;
  }

  private async recordClaimedJsonResource(
    placementId: string,
    column:
      | "discount_reservation_ids"
      | "loyalty_reservation"
      | "discount_redemption_ids"
      | "delivery_group_ids",
    value: unknown,
    conflictCode: string,
  ): Promise<void> {
    const encoded = JSON.stringify(value);
    const emptyValue = column === "loyalty_reservation" ? "NULL" : "'[]'::jsonb";
    const query = knex
      .raw(
        `UPDATE checkout.checkout_placements
          SET ?? = ?::jsonb, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'CLAIMED'
          AND (?? IS NOT DISTINCT FROM ${emptyValue} OR ?? = ?::jsonb)
      RETURNING id`,
        [column, encoded, placementId, column, column, encoded],
      )
      .toString();
    const updated = await singleOrNull(this.connection.query<{ id: string }>(rawSql(query)));
    if (updated) return;

    const matches = knex
      .raw(`SELECT id FROM checkout.checkout_placements WHERE id = ? AND ?? = ?::jsonb LIMIT 1`, [
        placementId,
        column,
        encoded,
      ])
      .toString();
    const existing = await singleOrNull(this.connection.query<{ id: string }>(rawSql(matches)));
    if (existing) return;
    throw new Error(conflictCode);
  }
}

function placementMatchesTransition(
  existing: CheckoutPlacementRecord,
  input: Parameters<CheckoutPlacementRepository["transition"]>[1],
): boolean {
  if (input.to === "RESOURCES_RESERVED") {
    return (
      existing.requestedOrderId === input.requestedOrderId &&
      sameStringArray(existing.discountReservationIds, input.discountReservationIds) &&
      sameStringArray(existing.discountRedemptionIds, input.discountRedemptionIds) &&
      JSON.stringify(existing.loyaltyReservation) === JSON.stringify(input.loyaltyReservation)
    );
  }
  if (input.to === "ORDER_CREATED") {
    return existing.orderId === input.orderId;
  }
  return (
    existing.paymentCollectionId === input.paymentCollectionId &&
    existing.paymentSessionId === input.paymentSessionId &&
    existing.paymentOperationId === input.paymentOperationId
  );
}

function sameStringArray(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function hasReachedPlacementState(
  current: CheckoutPlacementStatus,
  target: Exclude<CheckoutPlacementStatus, "CLAIMED" | "PLACED" | "FAILED">,
): boolean {
  if (current === "FAILED") return false;
  const rank: Record<Exclude<CheckoutPlacementStatus, "FAILED">, number> = {
    CLAIMED: 0,
    RESOURCES_RESERVED: 1,
    ORDER_CREATED: 2,
    PAYMENT_CREATED: 3,
    PLACED: 4,
  };
  return rank[current] >= rank[target];
}

function mapPlacement(row: PlacementRow): CheckoutPlacementRecord {
  return {
    placementId: row.id,
    storeId: row.store_id,
    checkoutId: row.checkout_id,
    idempotencyKey: row.idempotency_key,
    requestHash: row.request_hash,
    credentialId: row.credential_id,
    workflowId: row.workflow_id,
    requestInput: row.request_input,
    status: row.status,
    discountReservationIds: row.discount_reservation_ids,
    discountRedemptionIds: row.discount_redemption_ids,
    deliveryGroupIds: row.delivery_group_ids,
    loyaltyReservation: row.loyalty_reservation,
    requestedOrderId: row.requested_order_id,
    orderId: row.order_id,
    paymentCollectionId: row.payment_collection_id,
    paymentSessionId: row.payment_session_id,
    paymentOperationId: row.payment_operation_id,
    paymentMonitorInput: row.payment_monitor_input,
    paymentMonitorWorkflowId: row.payment_monitor_workflow_id,
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
