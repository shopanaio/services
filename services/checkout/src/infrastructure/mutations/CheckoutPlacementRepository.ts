import { rawSql, singleOrNull, type SQLExecutor } from "@event-driven-io/dumbo";
import { dumboPool } from "../db/dumbo.js";
import { knex } from "../db/knex.js";

export type CheckoutPlacementStatus = "IN_PROGRESS" | "PLACED" | "FAILED";

export interface CheckoutPlacementRecord<TResult = unknown> {
  placementId: string;
  storeId: string;
  checkoutId: string;
  checkoutVersion: number;
  resultRevision: string;
  idempotencyKey: string;
  requestHash: string;
  status: CheckoutPlacementStatus;
  result: TResult | null;
}

type PlacementRow = {
  id: string;
  store_id: string;
  checkout_id: string;
  checkout_version: number;
  result_revision: string;
  idempotency_key: string;
  request_hash: string;
  status: CheckoutPlacementStatus;
  result: unknown | null;
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
  }): Promise<CheckoutPlacementRecord> {
    const insert = knex.raw(
      `INSERT INTO checkout.checkout_placements (
         store_id, checkout_id, checkout_version, result_revision,
         idempotency_key, request_hash
       )
       SELECT ?, ?, ?, ?, ?, ?
       FROM checkout.checkouts
       WHERE store_id = ? AND id = ? AND version = ? AND result_revision = ?
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [
        input.storeId,
        input.checkoutId,
        input.checkoutVersion,
        input.resultRevision,
        input.idempotencyKey,
        input.requestHash,
        input.storeId,
        input.checkoutId,
        input.checkoutVersion,
        input.resultRevision,
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
      .where({ id: placementId, status: "IN_PROGRESS" })
      .returning("*")
      .toString();
    const updated = await singleOrNull(
      this.execute.query<PlacementRow>(rawSql(query)),
    );
    if (updated) return mapPlacement(updated) as CheckoutPlacementRecord<TResult>;

    const existing = await this.findById<TResult>(placementId);
    if (existing?.status === "PLACED") return existing;
    throw new Error("CHECKOUT_PLACEMENT_COMPLETION_CONFLICT");
  }

  async abandon(placementId: string): Promise<void> {
    const query = knex
      .withSchema("checkout")
      .table("checkout_placements")
      .delete()
      .where({ id: placementId, status: "IN_PROGRESS" })
      .returning("id")
      .toString();
    const deleted = await singleOrNull(
      this.execute.query<{ id: string }>(rawSql(query)),
    );
    if (deleted) return;

    const existing = await this.findById(placementId);
    if (!existing) return;
    throw new Error("CHECKOUT_PLACEMENT_ABANDON_CONFLICT");
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

  async findByIdForStore<TResult = unknown>(
    placementId: string,
    storeId: string,
  ): Promise<CheckoutPlacementRecord<TResult> | null> {
    const query = knex
      .withSchema("checkout")
      .table("checkout_placements")
      .select("*")
      .where({ id: placementId, store_id: storeId })
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
    status: row.status,
    result: row.result,
  };
}
