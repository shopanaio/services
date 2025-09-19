import { rawSql } from "@event-driven-io/dumbo";
import { postgreSQLRawBatchSQLProjection } from "@event-driven-io/emmett-postgresql";
import type { Event } from "@event-driven-io/emmett";
import type { CheckoutCreatedPayload } from "@src/domain/checkout/events";
import { createHash } from "node:crypto";
import { knex } from "@src/infrastructure/db/knex";
import { CheckoutCommandMetadata } from "@src/domain/checkout/commands";

// IMPORTANT: this inline projection runs within the same PostgreSQL transaction
// as Emmet Event Store event append (see getPostgreSQLEventStore → beforeCommitHook).
// This guarantees strict ACID: idempotency table insert commits/rollbacks
// together with event recording.
type CheckoutCreatedEvent = Event & {
  type: "checkout.created";
  data: CheckoutCreatedPayload;
  metadata: CheckoutCommandMetadata;
};

export const idempotencyProjection =
  postgreSQLRawBatchSQLProjection<CheckoutCreatedEvent>((events) => {
    const sqls = events.map((event) => {
      const req = {
        projectId: (event.metadata as any).projectId,
        currencyCode: event.data.currencyCode,
        displayCurrencyCode: event.data.displayCurrencyCode,
        displayExchangeRate: event.data.displayExchangeRate,
        salesChannel: event.data.salesChannel,
      };
      const requestHash = createHash("sha256")
        .update(JSON.stringify(req))
        .digest("hex");

      const response = {
        id: event.metadata.aggregateId,
        projectId: (event.metadata as any).projectId,
        currencyCode: event.data.currencyCode,
        subtotal: 0,
        grandTotal: 0,
        status: "new",
        lineItems: [],
      };

      const ttlSeconds = 24 * 60 * 60; // 24h

      const q = knex
        .withSchema("platform")
        .table("idempotency")
        .insert({
          project_id: (event.metadata as any).projectId,
          idempotency_key: event.data.idempotencyKey,
          request_hash: requestHash,
          response: knex.raw(`?::jsonb`, [JSON.stringify(response)]),
          expires_at: knex.raw(`NOW() + (? || ' seconds')::interval`, [
            ttlSeconds,
          ]),
        })
        .toString();

      return rawSql(q);
    });

    return sqls;
  }, "checkout.created");
