import { rawSql } from "@event-driven-io/dumbo";
import { postgreSQLRawBatchSQLProjection } from "@event-driven-io/emmett-postgresql";
import type { Event } from "@event-driven-io/emmett";
import type { OrderCreatedPayload } from "@src/domain/order/events";
import { knex } from "@src/infrastructure/db/knex";
import { OrderCommandMetadata } from "@src/domain/order/commands";

type OrderCreatedEvent = Event & {
  type: "order.created";
  data: OrderCreatedPayload;
  metadata: OrderCommandMetadata;
};

// Inline projection: materialize minimal order row
export const orderCreateProjection =
  postgreSQLRawBatchSQLProjection<OrderCreatedEvent>((events) => {
    const sqls = events.flatMap((event) => {
      const statements: ReturnType<typeof rawSql>[] = [];

      const insertOrderSql = knex
        .withSchema("platform")
        .table("orders")
        .insert({
          id: event.metadata.aggregateId,
          project_id: event.metadata.projectId as any,
          currency_code: event.data.currencyCode,
          created_at: event.metadata.now,
          updated_at: event.metadata.now,
          deleted_at: null,
        })
        .toString();

      statements.push(rawSql(insertOrderSql));
      return statements;
    });

    return sqls;
  }, "order.created");
