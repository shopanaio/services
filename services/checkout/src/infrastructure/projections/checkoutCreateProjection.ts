import { rawSql } from "@event-driven-io/dumbo";
import { postgreSQLRawBatchSQLProjection } from "@event-driven-io/emmett-postgresql";
import type { Event } from "@event-driven-io/emmett";
import type { CheckoutCreatedPayload } from "@src/domain/checkout/events";
import { knex } from "@src/infrastructure/db/knex";
import { CheckoutCommandMetadata } from "@src/domain/checkout/commands";

type CheckoutCreatedEvent = Event & {
  type: "checkout.created";
  data: CheckoutCreatedPayload;
  metadata: CheckoutCommandMetadata;
};

// Inline projection: materialize minimal checkout row
export const checkoutCreateProjection =
  postgreSQLRawBatchSQLProjection<CheckoutCreatedEvent>((events) => {
    const sqls = events.flatMap((event) => {
      const statements: ReturnType<typeof rawSql>[] = [];

      const insertCheckoutSql = knex
        .withSchema("platform")
        .table("checkouts")
        .insert({
          id: event.metadata.aggregateId,
          project_id: event.metadata.projectId as any,
          api_key_id: null,
          admin_id: null,
          sales_channel: event.data.salesChannel,
          external_source: event.data.externalSource,
          external_id: event.data.externalId,
          customer_id: null,
          customer_email: null,
          customer_phone_e164: null,
          customer_country_code: null,
          customer_note: null,
          locale_code: event.data.localeCode as any,
          currency_code: event.data.currencyCode,
          display_currency_code: event.data.displayCurrencyCode,
          display_exchange_rate: event.data.displayExchangeRate as any,
          subtotal: 0,
          shipping_total: 0,
          discount_total: 0,
          tax_total: 0,
          grand_total: 0,
          status: "new",
          expires_at: null,
          projected_version: 0,
          metadata: knex.raw("?::jsonb", [JSON.stringify({})]),
          created_at: event.metadata.now,
          updated_at: event.metadata.now,
          deleted_at: null,
        })
        .toString();

      statements.push(rawSql(insertCheckoutSql));
      console.log(event.data.deliveryGroups, "event.data.deliveryGroups");
      const deliveryGroups = event.data.deliveryGroups || [];
      if (deliveryGroups.length > 0) {
        const insertGroupsSql = knex
          .withSchema("platform")
          .table("checkout_delivery_groups")
          .insert(
            deliveryGroups.map((g) => ({
              id: g.id,
              project_id: event.metadata.projectId as any,
              checkout_id: event.metadata.aggregateId,
              selected_delivery_method: null,
              line_item_ids: knex.raw("ARRAY[]::uuid[]"),
              created_at: event.metadata.now,
              updated_at: event.metadata.now,
            }))
          )
          .toString();

        statements.push(rawSql(insertGroupsSql));
      }

      const methods = (event.data.deliveryGroups || []).flatMap((g) =>
        (g.deliveryMethods || []).map((m) => ({ groupId: g.id, method: m }))
      );
      if (methods.length > 0) {
        const insertMethodsSql = knex
          .withSchema("platform")
          .table("checkout_delivery_methods")
          .insert(
            methods.map(({ groupId, method }) => ({
              code: method.code,
              project_id: event.metadata.projectId as any,
              delivery_group_id: groupId,
              delivery_method_type: method.deliveryMethodType,
              payment_model: method.shippingPaymentModel,
            }))
          )
          .toString();

        statements.push(rawSql(insertMethodsSql));
      }

      return statements;
    });

    return sqls;
  }, "checkout.created");
