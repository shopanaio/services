import { rawSql } from "@event-driven-io/dumbo";
import { postgreSQLRawBatchSQLProjection } from "@event-driven-io/emmett-postgresql";
import type { Event } from "@event-driven-io/emmett";
import { knex } from "@src/infrastructure/db/knex";
import { CheckoutCommandMetadata } from "@src/domain/checkout/commands";

type IdempotentEvent = Event & {
  metadata: CheckoutCommandMetadata & {
    idempotencyKey?: string;
  };
};

// Generic inline projection for idempotency tracking
export const idempotencyProjectionGeneric =
  postgreSQLRawBatchSQLProjection<IdempotentEvent>((events) => {
    const sqls = events
      .filter((e) => !!e.metadata.idempotencyKey)
      .map((event) => {
        const q = knex
          .withSchema("platform")
          .table("idempotency")
          .insert({
            project_id: event.metadata.projectId,
            idempotency_key: event.metadata.idempotencyKey!,
            request_hash: "",
            response: JSON.stringify({
              aggregate_id: event.metadata.aggregateId,
              last_event_type: event.type,
              last_event_created_at: event.metadata.now || new Date(),
            }),
            expires_at: knex.raw("NOW() + INTERVAL '24 hours'"),
          })
          .onConflict(['project_id', 'idempotency_key'])
          .merge({
            response: knex.raw("EXCLUDED.response"),
            created_at: knex.fn.now(),
          })
          .toString();
        return rawSql(q);
      });

    return sqls;
  });
