import { rawSql } from "@event-driven-io/dumbo";
import { postgreSQLRawSQLProjection } from "@event-driven-io/emmett-postgresql";
import type { Event } from "@event-driven-io/emmett";
import type { CheckoutLanguageCodeUpdatedPayload } from "@src/domain/checkout/events";
import { knex } from "@src/infrastructure/db/knex";
import { CheckoutCommandMetadata } from "@src/domain/checkout/commands";

type CheckoutLanguageCodeUpdatedEvent = Event & {
  type: "checkout.language.code.updated";
  data: CheckoutLanguageCodeUpdatedPayload;
  metadata: CheckoutCommandMetadata;
};

// Inline projection: update locale code
export const checkoutLanguageProjection =
  postgreSQLRawSQLProjection<CheckoutLanguageCodeUpdatedEvent>((event) => {
    const q = knex
      .withSchema("platform")
      .table("checkouts")
      .where("id", event.metadata.aggregateId)
      .update({
        locale_code: event.data.localeCode,
        updated_at: knex.fn.now(),
      })
      .toString();
    return rawSql(q);
  }, "checkout.language.code.updated");
