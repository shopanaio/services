import { rawSql } from "@event-driven-io/dumbo";
import { postgreSQLRawSQLProjection } from "@event-driven-io/emmett-postgresql";
import type { Event } from "@event-driven-io/emmett";
import type { CheckoutCustomerNoteUpdatedPayload } from "@src/domain/checkout/events";
import { knex } from "@src/infrastructure/db/knex";
import { CheckoutCommandMetadata } from "@src/domain/checkout/commands";

type CheckoutCustomerNoteUpdatedEvent = Event & {
  type: "checkout.customer.note.updated";
  data: CheckoutCustomerNoteUpdatedPayload;
  metadata: CheckoutCommandMetadata;
};

// Inline projection: update customer note
export const checkoutNoteProjection =
  postgreSQLRawSQLProjection<CheckoutCustomerNoteUpdatedEvent>((event) => {
    const q = knex
      .withSchema("platform")
      .table("checkouts")
      .where("id", event.metadata.aggregateId)
      .update({
        customer_note: event.data.note,
        updated_at: knex.fn.now(),
      })
      .toString();
    return rawSql(q);
  }, "checkout.customer.note.updated");