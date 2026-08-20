import { rawSql, singleOrNull, type SQLExecutor } from "@event-driven-io/dumbo";
import { v7 as uuidv7 } from "uuid";
import { knex } from "../db/knex.js";
import { dumboPool } from "../db/dumbo.js";
import {
  CheckoutMutationError,
  type CheckoutCommittedSnapshot,
  type CheckoutCreateIdempotencyPort,
  type CheckoutCreateIdempotencyRequest,
  type CheckoutCreateIdempotencyReservation,
  type CheckoutCreateReservationResult,
  type CheckoutMutationPublicFailure,
} from "../../application/mutations/contracts.js";
interface IdempotencyRow {
  request_hash: string;
  checkout_id: string;
  initiating_credential_id: string;
  reserved_ids: CheckoutCreateIdempotencyReservation["reservedIds"];
  status: "IN_PROGRESS" | "RETRYABLE_FAILED" | "FINAL_FAILED" | "COMMITTED";
  lease_token: string;
  lease_expires_at: Date | string | null;
  public_failure: CheckoutMutationPublicFailure | null;
  snapshot: CheckoutCommittedSnapshot | null;
}

export class CheckoutCreateIdempotencyRepository implements CheckoutCreateIdempotencyPort {
  constructor(
    private readonly execute: SQLExecutor = dumboPool.execute,
    private readonly now: () => Date = () => new Date(),
    private readonly leaseMs = 30_000,
    private readonly createLeaseToken: () => string = uuidv7,
  ) {}

  async reserve(input: CheckoutCreateIdempotencyRequest): Promise<CheckoutCreateReservationResult> {
    const now = this.now();
    const leaseToken = this.createLeaseToken();
    const insert = knex
      .raw(
        `INSERT INTO checkout.checkout_create_idempotency (
         store_id, connection_id, operation, idempotency_key, request_hash,
         checkout_id, initiating_credential_id, reserved_ids, status,
         lease_token, lease_expires_at, created_at, updated_at
       ) VALUES (
         ?, ?, ?, ?, ?, ?, ?, ?::jsonb, 'IN_PROGRESS', ?,
         CURRENT_TIMESTAMP + (? * INTERVAL '1 millisecond'), ?, ?
       )
       ON CONFLICT (store_id, connection_id, operation, idempotency_key) DO NOTHING
       RETURNING request_hash, checkout_id, initiating_credential_id, reserved_ids,
                 status, lease_token, lease_expires_at, public_failure,
                 NULL::jsonb AS snapshot`,
        [
          input.identity.storeId,
          input.identity.connectionId,
          input.identity.operation,
          input.identity.idempotencyKey,
          input.requestHash,
          input.checkoutId,
          input.initiatingCredentialId,
          JSON.stringify(input.reservedIds),
          leaseToken,
          this.leaseMs,
          now.toISOString(),
          now.toISOString(),
        ],
      )
      .toString();
    let row = await singleOrNull(this.execute.query<IdempotencyRow>(rawSql(insert)));
    if (row) {
      return {
        status: "RESERVED",
        reservation: { ...input, leaseToken: row.lease_token },
      };
    }
    row = await this.loadRow(input);
    if (!row) throw new Error("Checkout idempotency reservation disappeared");
    if (row.request_hash !== input.requestHash) return { status: "KEY_REUSED" };
    if (row.status === "COMMITTED") {
      if (row.snapshot) return { status: "COMMITTED", checkout: row.snapshot };
      throw new CheckoutMutationError(
        "CHECKOUT_IDEMPOTENCY_STATE_INVALID",
        "Committed checkout replay is unavailable.",
        false,
      );
    }
    if (row.status === "FINAL_FAILED") {
      return {
        status: "FINAL_FAILED",
        failure: row.public_failure ?? {
          code: "CHECKOUT_CREATE_FAILED",
          message: "Checkout creation failed.",
          retryable: false,
        },
      };
    }
    const reacquired = await this.reacquire(input, row.status, leaseToken, now);
    if (reacquired) return { status: "RESERVED", reservation: reacquired };
    return { status: "IN_PROGRESS" };
  }

  async markFailed(input: {
    reservation: CheckoutCreateIdempotencyReservation;
    failure: CheckoutMutationPublicFailure;
    final: boolean;
  }): Promise<void> {
    const query = knex
      .withSchema("checkout")
      .table("checkout_create_idempotency")
      .where({
        store_id: input.reservation.identity.storeId,
        connection_id: input.reservation.identity.connectionId,
        operation: input.reservation.identity.operation,
        idempotency_key: input.reservation.identity.idempotencyKey,
        request_hash: input.reservation.requestHash,
        status: "IN_PROGRESS",
        lease_token: input.reservation.leaseToken,
      })
      .update({
        status: input.final ? "FINAL_FAILED" : "RETRYABLE_FAILED",
        public_failure: knex.raw("?::jsonb", [JSON.stringify(input.failure)]),
        lease_expires_at: null,
        updated_at: this.now().toISOString(),
      })
      .toString();
    await this.execute.command(rawSql(query));
  }

  private async loadRow(input: CheckoutCreateIdempotencyRequest) {
    const query = knex
      .raw(
        `SELECT i.request_hash, i.checkout_id, i.initiating_credential_id,
              i.reserved_ids, i.status, i.lease_token, i.lease_expires_at,
              i.public_failure,
              s.snapshot
         FROM checkout.checkout_create_idempotency i
         LEFT JOIN checkout.checkout_current_snapshots s
           ON s.checkout_id = i.committed_checkout_id AND s.store_id = i.store_id
        WHERE i.store_id = ? AND i.connection_id = ? AND i.operation = ?
          AND i.idempotency_key = ?`,
        [
          input.identity.storeId,
          input.identity.connectionId,
          input.identity.operation,
          input.identity.idempotencyKey,
        ],
      )
      .toString();
    return singleOrNull(this.execute.query<IdempotencyRow>(rawSql(query)));
  }

  private async reacquire(
    input: CheckoutCreateIdempotencyRequest,
    previousStatus: IdempotencyRow["status"],
    leaseToken: string,
    now: Date,
  ): Promise<CheckoutCreateIdempotencyReservation | null> {
    const query = knex
      .raw(
        `UPDATE checkout.checkout_create_idempotency
          SET status = 'IN_PROGRESS', lease_token = ?,
              lease_expires_at = CURRENT_TIMESTAMP + (? * INTERVAL '1 millisecond'),
              public_failure = NULL, updated_at = ?
        WHERE store_id = ? AND connection_id = ? AND operation = ?
          AND idempotency_key = ? AND request_hash = ? AND status = ?
          AND (status = 'RETRYABLE_FAILED' OR lease_expires_at <= CURRENT_TIMESTAMP)
      RETURNING checkout_id, initiating_credential_id, reserved_ids, lease_token`,
        [
          leaseToken,
          this.leaseMs,
          now.toISOString(),
          input.identity.storeId,
          input.identity.connectionId,
          input.identity.operation,
          input.identity.idempotencyKey,
          input.requestHash,
          previousStatus,
        ],
      )
      .toString();
    const row = await singleOrNull(
      this.execute.query<
        Pick<
          IdempotencyRow,
          "checkout_id" | "initiating_credential_id" | "reserved_ids" | "lease_token"
        >
      >(rawSql(query)),
    );
    return row
      ? {
          ...input,
          checkoutId: row.checkout_id,
          initiatingCredentialId: row.initiating_credential_id,
          reservedIds: row.reserved_ids,
          leaseToken: row.lease_token,
        }
      : null;
  }
}
