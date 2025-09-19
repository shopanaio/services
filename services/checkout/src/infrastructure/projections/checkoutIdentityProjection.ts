import { rawSql } from "@event-driven-io/dumbo";
import { postgreSQLRawSQLProjection } from "@event-driven-io/emmett-postgresql";
import type { Event } from "@event-driven-io/emmett";
import type { CheckoutCustomerIdentityUpdatedPayload } from "@src/domain/checkout/events";
import { knex } from "@src/infrastructure/db/knex";
import { CheckoutCommandMetadata } from "@src/domain/checkout/commands";

type CheckoutCustomerIdentityUpdatedEvent = Event & {
  type: "checkout.customer.identity.updated";
  data: CheckoutCustomerIdentityUpdatedPayload;
  metadata: CheckoutCommandMetadata;
};

// Inline projection: update customer identity fields
export const checkoutIdentityProjection =
  postgreSQLRawSQLProjection<CheckoutCustomerIdentityUpdatedEvent>((event) => {
    const q = knex
      .withSchema("platform")
      .table("checkouts")
      .where("id", event.metadata.aggregateId)
      .update({
        customer_email: event.data.email,
        customer_id: event.data.customerId as any,
        customer_phone_e164: event.data.phone,
        customer_country_code: event.data.countryCode as any,
        updated_at: knex.fn.now(),
      })
      .toString();
    return rawSql(q);
  }, "checkout.customer.identity.updated");
