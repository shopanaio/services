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
import { checkoutCommittedSnapshotSchema } from "../../application/mutations/checkoutCommittedSnapshotSchema.js";
import { checkoutRetentionPolicy } from "../../configuration/checkoutRetention.js";

type SnapshotRow = {
  snapshot: CheckoutCommittedSnapshot;
  status?: CheckoutCommittedSnapshot["lifecycle"]["status"];
  expires_at?: Date | string;
  pii_anonymized_at?: Date | string | null;
  retention_until?: Date | string;
};

const DAY_MS = 24 * 60 * 60 * 1_000;

export class CheckoutMutationRepository
  implements CheckoutMutationSnapshotPort, CheckoutRecalculationCommitPort
{
  constructor(private readonly execute: SQLExecutor = dumboPool.execute) {}

  async enforceRetention(batchSize = checkoutRetentionPolicy().cleanup_batch_size): Promise<{
    expired: number;
    anonymized: number;
    purged: number;
  }> {
    const query = knex
      .raw(
        `WITH candidates AS MATERIALIZED (
         SELECT id, store_id, status, expires_at, retention_until
           FROM checkout.checkouts
          WHERE ((status IN ('OPEN', 'READY') AND expires_at <= CURRENT_TIMESTAMP)
             OR retention_until <= CURRENT_TIMESTAMP)
            AND NOT EXISTS (
              SELECT 1
                FROM checkout.checkout_placements p
               WHERE p.store_id = checkouts.store_id AND p.checkout_id = checkouts.id
                 AND p.status IN ('CLAIMED', 'RESOURCES_RESERVED', 'ORDER_CREATED', 'PAYMENT_CREATED')
            )
          ORDER BY LEAST(expires_at, retention_until)
          LIMIT ?
          FOR UPDATE SKIP LOCKED
       ), expired AS (
         UPDATE checkout.checkouts c
            SET status = 'EXPIRED', pii_anonymized_at = COALESCE(c.pii_anonymized_at, CURRENT_TIMESTAMP),
                customer_note = NULL, updated_at = CURRENT_TIMESTAMP
           FROM candidates x
          WHERE c.id = x.id AND c.store_id = x.store_id
            AND x.status IN ('OPEN', 'READY')
            AND x.expires_at <= CURRENT_TIMESTAMP
            AND x.retention_until > CURRENT_TIMESTAMP
         RETURNING c.id, c.store_id
       ), anonymized AS (
         UPDATE checkout.checkout_current_snapshots s
            SET snapshot = checkout.strip_snapshot_pii(s.snapshot), updated_at = CURRENT_TIMESTAMP
           FROM expired e
          WHERE s.checkout_id = e.id AND s.store_id = e.store_id
         RETURNING s.checkout_id
       ), anonymized_quarantine AS (
         UPDATE checkout.checkout_snapshot_quarantine q
            SET snapshot = checkout.strip_snapshot_pii(q.snapshot),
                quarantined_at = CURRENT_TIMESTAMP
           FROM expired e
          WHERE q.checkout_id = e.id AND q.store_id = e.store_id
         RETURNING q.checkout_id
       ), purge_candidates AS MATERIALIZED (
         SELECT id, store_id FROM candidates WHERE retention_until <= CURRENT_TIMESTAMP
       ), deleted_placements AS (
         DELETE FROM checkout.checkout_placements p
          USING purge_candidates c
          WHERE p.store_id = c.store_id AND p.checkout_id = c.id
       ), deleted_idempotency AS (
         DELETE FROM checkout.checkout_create_idempotency i
          USING purge_candidates p
          WHERE i.store_id = p.store_id AND i.committed_checkout_id = p.id
       ), deleted_quarantine AS (
         DELETE FROM checkout.checkout_snapshot_quarantine q
          USING purge_candidates p
          WHERE q.store_id = p.store_id AND q.checkout_id = p.id
       ), purged AS (
         DELETE FROM checkout.checkouts c USING purge_candidates p
          WHERE c.id = p.id AND c.store_id = p.store_id
         RETURNING c.id
       )
       SELECT
         (SELECT count(*)::int FROM expired) AS expired,
         (SELECT count(*)::int FROM anonymized) AS anonymized,
         (SELECT count(*)::int FROM purged) AS purged`,
        [batchSize],
      )
      .toString();
    const row = await singleOrNull(
      this.execute.query<{
        expired: number;
        anonymized: number;
        purged: number;
      }>(rawSql(query)),
    );
    return row ?? { expired: 0, anonymized: 0, purged: 0 };
  }

  async load(input: {
    checkoutId: string;
    storeId: string;
  }): Promise<CheckoutCommittedSnapshot | null> {
    return this.loadScoped(input);
  }

  async loadOwned(input: {
    checkoutId: string;
    storeId: string;
    visitorId: string;
  }): Promise<CheckoutCommittedSnapshot | null> {
    return this.loadScoped(input);
  }

  private async loadScoped(input: {
    checkoutId: string;
    storeId: string;
    visitorId?: string;
  }): Promise<CheckoutCommittedSnapshot | null> {
    const query = knex
      .withSchema("checkout")
      .table("checkout_current_snapshots as snapshots")
      .innerJoin("checkout.checkouts as checkouts", function () {
        this.on("checkouts.id", "=", "snapshots.checkout_id").andOn(
          "checkouts.store_id",
          "=",
          "snapshots.store_id",
        );
      })
      .select(
        "snapshots.snapshot",
        "checkouts.status",
        "checkouts.expires_at",
        "checkouts.pii_anonymized_at",
        "checkouts.retention_until",
      )
      .where({
        "snapshots.checkout_id": input.checkoutId,
        "snapshots.store_id": input.storeId,
        ...(input.visitorId ? { "checkouts.owner_visitor_id": input.visitorId } : {}),
      })
      .limit(1)
      .toString();
    const row = await singleOrNull(this.execute.query<SnapshotRow>(rawSql(query)));
    if (!row) return null;
    const parsed = checkoutCommittedSnapshotSchema.safeParse(withLifecycle(row));
    if (parsed.success) return parsed.data as unknown as CheckoutCommittedSnapshot;
    await this.quarantine(input, row.snapshot, parsed.error.message);
    throw new Error("CHECKOUT_SNAPSHOT_QUARANTINED");
  }

  private async quarantine(
    input: { checkoutId: string; storeId: string },
    snapshot: unknown,
    reason: string,
  ): Promise<void> {
    const query = knex
      .raw(
        `INSERT INTO checkout.checkout_snapshot_quarantine
         (checkout_id, store_id, snapshot, reason, quarantined_at)
       VALUES (?, ?, ?::jsonb, ?, CURRENT_TIMESTAMP)
       ON CONFLICT (store_id, checkout_id) DO UPDATE
         SET snapshot = EXCLUDED.snapshot,
             reason = EXCLUDED.reason,
             quarantined_at = EXCLUDED.quarantined_at`,
        [input.checkoutId, input.storeId, JSON.stringify(snapshot), reason.slice(0, 16_384)],
      )
      .toString();
    await this.execute.query(rawSql(query));
  }

  async create(input: {
    reservation: CheckoutCreateIdempotencyReservation;
    draft: CheckoutMutationDraft;
    result: CheckoutRecalculationResult;
  }): Promise<
    { status: "COMMITTED"; checkout: CheckoutCommittedSnapshot } | { status: "VERSION_CONFLICT" }
  > {
    const now = new Date().toISOString();
    const retention = checkoutRetentionPolicy();
    const expiresAt = new Date(Date.parse(now) + retention.active_ttl_days * DAY_MS).toISOString();
    const retentionUntil = new Date(
      Date.parse(now) + retention.snapshot_retention_days * DAY_MS,
    ).toISOString();
    const checkout = snapshot(input.draft, input.result, now, now, expiresAt, retentionUntil);
    const projection = canonicalProjection(input.result);
    const sql = knex
      .raw(
        `WITH locked_reservation AS MATERIALIZED (
         SELECT checkout_id FROM checkout.checkout_create_idempotency
          WHERE store_id = ? AND connection_id = ? AND operation = ?
            AND idempotency_key = ? AND request_hash = ? AND status = 'IN_PROGRESS'
            AND lease_token = ? AND lease_expires_at > CURRENT_TIMESTAMP
            FOR UPDATE
       ), inserted_checkout AS (
         INSERT INTO checkout.checkouts (
           id, store_id, owner_visitor_id, version, channel_code, external_source, external_id,
           customer_note, locale_code, currency_code, subtotal, shipping_total,
           discount_total, tax_total, grand_total, status, result_revision,
           checkout_valid, pipeline_issues, metadata, expires_at, retention_until,
           created_at, updated_at
         ) SELECT ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, '{}'::jsonb, ?, ?, ?, ?
             FROM locked_reservation WHERE checkout_id = ?
         ON CONFLICT (id) DO NOTHING
         RETURNING id
       ), inserted_snapshot AS (
         INSERT INTO checkout.checkout_current_snapshots
           (checkout_id, store_id, checkout_version, snapshot, created_at, updated_at)
         SELECT ?, ?, 1, ?::jsonb, ?, ? FROM inserted_checkout
         RETURNING checkout_id
       ), committed_idempotency AS (
         UPDATE checkout.checkout_create_idempotency
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
          input.reservation.ownerVisitorId,
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
          projection.valid ? "READY" : "OPEN",
          input.result.resultRevision,
          projection.valid,
          JSON.stringify(input.result.issues),
          expiresAt,
          retentionUntil,
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
      )
      .toString();
    const row = await singleOrNull(this.execute.query<SnapshotRow>(rawSql(sql)));
    return row ? { status: "COMMITTED", checkout: row.snapshot } : { status: "VERSION_CONFLICT" };
  }

  async commit(input: {
    storeId: string;
    checkoutId: string;
    visitorId: string;
    expectedVersion: number;
    nextVersion: number;
    createdAt: string;
    draft: CheckoutMutationDraft;
    result: CheckoutRecalculationResult;
  }): Promise<
    { status: "COMMITTED"; checkout: CheckoutCommittedSnapshot } | { status: "VERSION_CONFLICT" }
  > {
    const now = new Date().toISOString();
    const retention = checkoutRetentionPolicy();
    const expiresAt = new Date(Date.parse(now) + retention.active_ttl_days * DAY_MS).toISOString();
    const retentionUntil = new Date(
      Date.parse(now) + retention.snapshot_retention_days * DAY_MS,
    ).toISOString();
    const checkout = snapshot(
      input.draft,
      input.result,
      input.createdAt,
      now,
      expiresAt,
      retentionUntil,
    );
    const projection = canonicalProjection(input.result);
    const sql = knex
      .raw(
        `WITH updated_checkout AS (
         UPDATE checkout.checkouts
            SET version = ?, channel_code = ?, external_source = ?, external_id = ?,
                customer_note = ?, locale_code = ?, currency_code = ?, subtotal = ?,
                shipping_total = ?, discount_total = ?, tax_total = ?, grand_total = ?,
                status = ?, result_revision = ?, checkout_valid = ?, pipeline_issues = ?::jsonb,
                expires_at = ?, retention_until = ?,
                updated_at = ?
          WHERE id = ? AND store_id = ? AND owner_visitor_id = ? AND version = ?
            AND status IN ('OPEN', 'READY') AND expires_at > CURRENT_TIMESTAMP
            AND NOT EXISTS (
              SELECT 1 FROM checkout.checkout_placements
               WHERE store_id = ? AND checkout_id = ?
            )
            AND EXISTS (
              SELECT 1 FROM checkout.checkout_current_snapshots
               WHERE checkout_id = ? AND store_id = ? AND checkout_version = ?
            )
         RETURNING id
       ), updated_snapshot AS (
         UPDATE checkout.checkout_current_snapshots
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
          projection.valid ? "READY" : "OPEN",
          input.result.resultRevision,
          projection.valid,
          JSON.stringify(input.result.issues),
          expiresAt,
          retentionUntil,
          now,
          input.checkoutId,
          input.storeId,
          input.visitorId,
          input.expectedVersion,
          input.storeId,
          input.checkoutId,
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
      )
      .toString();
    const row = await singleOrNull(this.execute.query<SnapshotRow>(rawSql(sql)));
    return row ? { status: "COMMITTED", checkout: row.snapshot } : { status: "VERSION_CONFLICT" };
  }

  commitWithoutRecalculation(input: {
    storeId: string;
    checkoutId: string;
    visitorId: string;
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
  expiresAt: string,
  retentionUntil: string,
): CheckoutCommittedSnapshot {
  return {
    checkoutId: draft.checkoutId,
    storeId: draft.storeId,
    version: draft.version,
    createdAt,
    updatedAt,
    lifecycle: {
      status:
        result.validation.status === "SUCCESS" && result.validation.data.valid ? "READY" : "OPEN",
      expiresAt,
      piiAnonymizedAt: null,
      retentionUntil,
    },
    draft,
    result,
  };
}

function withLifecycle(row: SnapshotRow): CheckoutCommittedSnapshot {
  if (!row.status || !row.expires_at || !row.retention_until) {
    throw new Error("CHECKOUT_LIFECYCLE_MISSING");
  }
  return {
    ...row.snapshot,
    lifecycle: {
      status: row.status,
      expiresAt: iso(row.expires_at),
      piiAnonymizedAt: row.pii_anonymized_at ? iso(row.pii_anonymized_at) : null,
      retentionUntil: iso(row.retention_until),
    },
  };
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function canonicalProjection(result: CheckoutRecalculationResult) {
  if (result.finalPricing.status !== "SUCCESS" || result.validation.status !== "SUCCESS") {
    throw new Error("Only a complete checkout pipeline result can be committed");
  }
  const totals = result.finalPricing.data.totals;
  const loyalty =
    result.loyalty.status === "SUCCESS" && result.loyalty.data.status === "QUOTED"
      ? result.loyalty.data.quote
      : null;
  return {
    subtotal: totals.merchandiseSubtotal.amountMinor,
    shippingTotal: totals.deliveryTotal.amountMinor,
    discountTotal: (
      BigInt(totals.merchandiseDiscountTotal.amountMinor) +
      BigInt(totals.deliveryDiscountTotal.amountMinor) +
      BigInt(loyalty?.discount.amountMinor ?? "0")
    ).toString(),
    taxTotal: totals.taxTotal.amountMinor,
    grandTotal: loyalty?.payableAfterLoyalty.amountMinor ?? totals.payableTotal.amountMinor,
    valid: result.validation.data.valid,
  };
}
