import { rawSql } from "@event-driven-io/dumbo";
import { postgreSQLRawSQLProjection } from "@event-driven-io/emmett-postgresql";
import type { Event } from "@event-driven-io/emmett";
import type { CheckoutCurrencyCodeUpdatedPayload } from "@src/domain/checkout/events";
import { knex } from "@src/infrastructure/db/knex";
import { CheckoutCommandMetadata } from "@src/domain/checkout/commands";

type CheckoutCurrencyCodeUpdatedEvent = Event & {
  type: "checkout.currency.code.updated";
  data: CheckoutCurrencyCodeUpdatedPayload;
  metadata: CheckoutCommandMetadata;
};

// Inline projection: update currency code
export const checkoutCurrencyProjection =
  postgreSQLRawSQLProjection<CheckoutCurrencyCodeUpdatedEvent>((event) => {
    const q = knex
      .withSchema("platform")
      .table("checkouts")
      .where("id", event.metadata.aggregateId)
      .update({
        currency_code: event.data.currencyCode,
        updated_at: knex.fn.now(),
      })
      .toString();
    return rawSql(q);
  }, "checkout.currency.code.updated");