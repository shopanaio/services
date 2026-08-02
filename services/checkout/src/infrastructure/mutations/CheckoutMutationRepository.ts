import { rawSql, singleOrNull, type SQLExecutor } from "@event-driven-io/dumbo";
import { knex } from "../db/knex.js";
import { dumboPool } from "../db/dumbo.js";
import type {
  CheckoutCommittedSnapshot,
  CheckoutCreateIdempotencyReservation,
  CheckoutMutationDraft,
  CheckoutMutationSnapshotPort,
  CheckoutRecalculationCommitPort,
} from "../../application/mutations/contracts.js";
import type { CheckoutRecalculationResult } from "../../application/pipeline/contracts/index.js";

type SnapshotRow = { snapshot: CheckoutCommittedSnapshot };

export class CheckoutMutationRepository
  implements CheckoutMutationSnapshotPort, CheckoutRecalculationCommitPort
{
  constructor(private readonly execute: SQLExecutor = dumboPool.execute) {}

  async load(input: {
    checkoutId: string;
    storeId: string;
  }): Promise<CheckoutCommittedSnapshot | null> {
    const query = knex
      .withSchema("platform")
      .table("checkout_current_snapshots")
      .select("snapshot")
      .where({ checkout_id: input.checkoutId, store_id: input.storeId })
      .limit(1)
      .toString();
    const row = await singleOrNull(this.execute.query<SnapshotRow>(rawSql(query)));
    return row?.snapshot ?? null;
  }

  async create(input: {
    reservation: CheckoutCreateIdempotencyReservation;
    draft: CheckoutMutationDraft;
    result: CheckoutRecalculationResult;
  }): Promise<
    | { status: "COMMITTED"; checkout: CheckoutCommittedSnapshot }
    | { status: "VERSION_CONFLICT" }
  > {
    const now = new Date().toISOString();
    const checkout = snapshot(input.draft, input.result, now, now);
    const projection = canonicalProjection(input.result);
    const sql = knex.raw(
      `WITH locked_reservation AS MATERIALIZED (
         SELECT checkout_id FROM platform.checkout_create_idempotency
          WHERE store_id = ? AND connection_id = ? AND operation = ?
            AND idempotency_key = ? AND request_hash = ? AND status = 'IN_PROGRESS'
            AND lease_token = ? AND lease_expires_at > CURRENT_TIMESTAMP
            FOR UPDATE
       ), inserted_checkout AS (
         INSERT INTO platform.checkouts (
           id, store_id, version, channel_code, external_source, external_id,
           customer_note, locale_code, currency_code, subtotal, shipping_total,
           discount_total, tax_total, grand_total, status, result_revision,
           checkout_valid, pipeline_issues, metadata, created_at, updated_at
         ) SELECT ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?::jsonb, '{}'::jsonb, ?, ?
             FROM locked_reservation WHERE checkout_id = ?
         ON CONFLICT (id) DO NOTHING
         RETURNING id
       ), inserted_snapshot AS (
         INSERT INTO platform.checkout_current_snapshots
           (checkout_id, store_id, checkout_version, snapshot, created_at, updated_at)
         SELECT ?, ?, 1, ?::jsonb, ?, ? FROM inserted_checkout
         RETURNING checkout_id
       ), committed_idempotency AS (
         UPDATE platform.checkout_create_idempotency
            SET status = 'COMMITTED', committed_checkout_id = ?,
                committed_checkout_version = 1, public_failure = NULL,
                lease_expires_at = NULL, updated_at = ?
          WHERE store_id = ? AND connection_id = ? AND operation = ?
            AND idempotency_key = ? AND request_hash = ? AND status = 'IN_PROGRESS'
            AND lease_token = ?
            AND EXISTS (SELECT 1 FROM inserted_snapshot)
         RETURNING checkout_id
       )
       SELECT ?::jsonb AS snapshot FROM committed_idempotency`,
      [
        input.reservation.identity.storeId,
        input.reservation.identity.connectionId,
        input.reservation.identity.operation,
        input.reservation.identity.idempotencyKey,
        input.reservation.requestHash,
        input.reservation.leaseToken,
        input.draft.checkoutId,
        input.draft.storeId,
        input.draft.channelCode,
        input.draft.externalSource,
        input.draft.externalId,
        input.draft.customerNote,
        input.draft.localeCode,
        input.draft.currencyCode,
        projection.subtotal,
        projection.shippingTotal,
        projection.discountTotal,
        projection.taxTotal,
        projection.grandTotal,
        input.result.resultRevision,
        projection.valid,
        JSON.stringify(input.result.issues),
        now,
        now,
        input.draft.checkoutId,
        input.draft.checkoutId,
        input.draft.storeId,
        JSON.stringify(checkout),
        now,
        now,
        input.draft.checkoutId,
        now,
        input.reservation.identity.storeId,
        input.reservation.identity.connectionId,
        input.reservation.identity.operation,
        input.reservation.identity.idempotencyKey,
        input.reservation.requestHash,
        input.reservation.leaseToken,
        JSON.stringify(checkout),
      ],
    ).toString();
    const row = await singleOrNull(this.execute.query<SnapshotRow>(rawSql(sql)));
    return row
      ? { status: "COMMITTED", checkout: row.snapshot }
      : { status: "VERSION_CONFLICT" };
  }

  async commit(input: {
    storeId: string;
    checkoutId: string;
    expectedVersion: number;
    nextVersion: number;
    createdAt: string;
    draft: CheckoutMutationDraft;
    result: CheckoutRecalculationResult;
  }): Promise<
    | { status: "COMMITTED"; checkout: CheckoutCommittedSnapshot }
    | { status: "VERSION_CONFLICT" }
  > {
    const now = new Date().toISOString();
    const checkout = snapshot(input.draft, input.result, input.createdAt, now);
    const projection = canonicalProjection(input.result);
    const sql = knex.raw(
      `WITH updated_checkout AS (
         UPDATE platform.checkouts
            SET version = ?, channel_code = ?, external_source = ?, external_id = ?,
                customer_note = ?, locale_code = ?, currency_code = ?, subtotal = ?,
                shipping_total = ?, discount_total = ?, tax_total = ?, grand_total = ?,
                result_revision = ?, checkout_valid = ?, pipeline_issues = ?::jsonb,
                updated_at = ?
          WHERE id = ? AND store_id = ? AND version = ?
            AND EXISTS (
              SELECT 1 FROM platform.checkout_current_snapshots
               WHERE checkout_id = ? AND store_id = ? AND checkout_version = ?
            )
         RETURNING id
       ), updated_snapshot AS (
         UPDATE platform.checkout_current_snapshots
            SET checkout_version = ?, snapshot = ?::jsonb, updated_at = ?
          WHERE checkout_id = ? AND store_id = ?
            AND checkout_version = ? AND EXISTS (SELECT 1 FROM updated_checkout)
         RETURNING checkout_id
       )
       SELECT ?::jsonb AS snapshot FROM updated_snapshot`,
      [
        input.nextVersion,
        input.draft.channelCode,
        input.draft.externalSource,
        input.draft.externalId,
        input.draft.customerNote,
        input.draft.localeCode,
        input.draft.currencyCode,
        projection.subtotal,
        projection.shippingTotal,
        projection.discountTotal,
        projection.taxTotal,
        projection.grandTotal,
        input.result.resultRevision,
        projection.valid,
        JSON.stringify(input.result.issues),
        now,
        input.checkoutId,
        input.storeId,
        input.expectedVersion,
        input.checkoutId,
        input.storeId,
        input.expectedVersion,
        input.nextVersion,
        JSON.stringify(checkout),
        now,
        input.checkoutId,
        input.storeId,
        input.expectedVersion,
        JSON.stringify(checkout),
      ],
    ).toString();
    const row = await singleOrNull(this.execute.query<SnapshotRow>(rawSql(sql)));
    return row
      ? { status: "COMMITTED", checkout: row.snapshot }
      : { status: "VERSION_CONFLICT" };
  }

  commitWithoutRecalculation(input: {
    storeId: string;
    checkoutId: string;
    expectedVersion: number;
    nextVersion: number;
    createdAt: string;
    draft: CheckoutMutationDraft;
    previousResult: CheckoutRecalculationResult;
  }) {
    return this.commit({
      ...input,
      result: input.previousResult,
    });
  }
}

function snapshot(
  draft: CheckoutMutationDraft,
  result: CheckoutRecalculationResult,
  createdAt: string,
  updatedAt: string,
): CheckoutCommittedSnapshot {
  return {
    checkoutId: draft.checkoutId,
    storeId: draft.storeId,
    version: draft.version,
    createdAt,
    updatedAt,
    draft,
    result,
  };
}

function canonicalProjection(result: CheckoutRecalculationResult) {
  if (result.finalPricing.status !== "SUCCESS" || result.validation.status !== "SUCCESS") {
    throw new Error("Only a complete checkout pipeline result can be committed");
  }
  const totals = result.finalPricing.data.totals;
  return {
    subtotal: totals.merchandiseSubtotal.amountMinor,
    shippingTotal: totals.deliveryTotal.amountMinor,
    discountTotal: (
      BigInt(totals.merchandiseDiscountTotal.amountMinor) +
      BigInt(totals.deliveryDiscountTotal.amountMinor)
    ).toString(),
    taxTotal: totals.taxTotal.amountMinor,
    grandTotal: totals.payableTotal.amountMinor,
    valid: result.validation.data.valid,
  };
}
