import { rawSql } from "@event-driven-io/dumbo";
import { postgreSQLRawBatchSQLProjection } from "@event-driven-io/emmett-postgresql";
import type { Event } from "@event-driven-io/emmett";
import type { OrderCreatedPayload } from "@src/domain/order/events";
import { createHash } from "node:crypto";
import { knex } from "@src/infrastructure/db/knex";
import { OrderCommandMetadata } from "@src/domain/order/commands";

/** Inline projection persisting idempotency results for order creation. */
type OrderCreatedEvent = Event & {
  type: "order.created";
  data: OrderCreatedPayload;
  metadata: OrderCommandMetadata;
};

export const orderIdempotencyProjection =
  postgreSQLRawBatchSQLProjection<OrderCreatedEvent>((events) => {
    const ttlSeconds = 24 * 60 * 60; // 24h

    const sqls = events.map((event) => {
      const requestDescriptor = {
        projectId: event.metadata.projectId,
        currencyCode: event.data.currencyCode,
        salesChannel: event.data.salesChannel,
      };
      const requestHash = createHash("sha256")
        .update(JSON.stringify(requestDescriptor))
        .digest("hex");

      const responseDescriptor = {
        id: event.metadata.aggregateId,
        projectId: event.metadata.projectId,
        currencyCode: event.data.currencyCode,
        orderNumber: event.data.orderNumber, // TODO: delete order number from idempotency completely
      };

      const q = knex
        .withSchema("platform")
        .table("idempotency")
        .insert({
          project_id: event.metadata.projectId,
          idempotency_key: event.data.idempotencyKey,
          request_hash: requestHash,
          response: knex.raw("?::jsonb", [JSON.stringify(responseDescriptor)]),
          expires_at: knex.raw("NOW() + (? || ' seconds')::interval", [
            ttlSeconds,
          ]),
        })
        .toString();

      return rawSql(q);
    });

    return sqls;
  }, "order.created");
