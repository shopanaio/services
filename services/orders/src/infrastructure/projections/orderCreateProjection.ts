import { rawSql } from "@event-driven-io/dumbo";
import { postgreSQLRawBatchSQLProjection } from "@event-driven-io/emmett-postgresql";
import type { Event } from "@event-driven-io/emmett";
import type { OrderCreatedPayload } from "@src/domain/order/events";
import { knex } from "@src/infrastructure/db/knex";
import { Money } from "@shopana/shared-money";
import { OrderCommandMetadata } from "@src/domain/order/commands";
import { consumeOrderCreateProjectionContext } from "@src/application/usecases/orderCreateProjectionContext";
import { App } from "@src/ioc/container";
import { coerceMoney, coerceNullableMoney } from "@src/utils/money";

type OrderCreatedEvent = Event & {
  type: "order.created";
  data: OrderCreatedPayload;
  metadata: OrderCommandMetadata;
};

// Inline projection: materialize minimal order row
/**
 * Coerces Money-like value to minor units (number) if possible.
 * Supports Money instance, JSON snapshot, or raw number.
 *
 * TODO: Accept wider input (Money | number | string | null | undefined)
 * and return a parameterized binding instead of string for safer bigint inserts.
 */
const toBigintSql = (m: Money | null): string | null =>
  m == null ? null : m.amountMinor().toString();

/**
 * Builds SQL value for uuid[] array from a list of UUID strings.
 *
 * TODO: Replace string interpolation with parameterized array binding
 * to avoid potential SQL injection and improve correctness.
 */
const uuidArray = (ids: readonly string[]) =>
  ids.length > 0
    ? knex.raw(`ARRAY[${ids.map((id) => `'${id}'::uuid`).join(", ")}]::uuid[]`)
    : knex.raw("ARRAY[]::uuid[]");

/**
 * Inline projection: materialize order row, items, delivery groups and applied discounts.
 */
export const orderCreateProjection =
  postgreSQLRawBatchSQLProjection<OrderCreatedEvent>(async (events, context) => {
    const sqls: ReturnType<typeof rawSql>[] = [];
    const { orderNumberRepository } = App.getInstance();

    for (const event of events) {
      const statements: ReturnType<typeof rawSql>[] = [];

      const projectId = event.metadata.projectId;
      const orderId = event.metadata.aggregateId;
      const projectionContext = consumeOrderCreateProjectionContext(orderId);
      const orderNumber = await orderNumberRepository.reserve(projectId, {
        executor: context.execute,
      });

      // Insert order head
      const insertOrderSql = knex
        .withSchema("platform")
        .table("orders")
        .insert({
          id: orderId,
          // TODO: Remove `as any` by aligning metadata type with DB schema (UUID/text).
          project_id: projectId as any,
          order_number: orderNumber,
          api_key_id: null,
          user_id: event.metadata.userId ?? null,
          sales_channel: event.data.salesChannel,
          external_source: event.data.externalSource,
          external_id: event.data.externalId,
          // TODO: Remove `as any` by using a proper branded/string type compatible with DB column.
          locale_code: event.data.localeCode as any,
          currency_code: event.data.currencyCode,
          // TODO: Use parameterized bindings for bigint values instead of strings.
          subtotal: toBigintSql(coerceMoney(event.data.subtotalAmount)) ?? null,
          shipping_total: toBigintSql(coerceMoney(event.data.totalShippingAmount)) ?? null,
          discount_total: toBigintSql(coerceMoney(event.data.totalDiscountAmount)) ?? null,
          tax_total: toBigintSql(coerceMoney(event.data.totalTaxAmount)) ?? null,
          grand_total: toBigintSql(coerceMoney(event.data.totalAmount)) ?? null,
          status: "DRAFT",
          placed_at: null,
          closed_at: null,
          expires_at: null,
          // TODO: Introduce small `jsonb(value)` helper to unify JSONB bindings.
          metadata: knex.raw("?::jsonb", [JSON.stringify({})]),
          projected_version: 0,
          created_at: event.metadata.now,
          updated_at: event.metadata.now,
          deleted_at: null,
        })
        .toString();
      statements.push(rawSql(insertOrderSql));

      // Insert order items
      const lines = event.data.lines || [];
      if (lines.length > 0) {
        const itemRows = lines.map((l) => {
          const unitPrice = coerceMoney(l.unit.price);
          const compareAtPrice = coerceNullableMoney(l.unit.compareAtPrice);
          const currencyCode = unitPrice.currency().code;
          const subtotalMoney = unitPrice
            .multiply(l.quantity)
            .normalizeScale();
          const zeroMoney = Money.zero(currencyCode);
          const discountMoney = zeroMoney;
          const taxMoney = zeroMoney;
          const totalMoney = subtotalMoney;

          return {
            id: l.lineId,
            project_id: projectId,
            order_id: orderId,
            quantity: l.quantity,
            subtotal_amount: toBigintSql(subtotalMoney),
            discount_amount: toBigintSql(discountMoney),
            tax_amount: toBigintSql(taxMoney),
            total_amount: toBigintSql(totalMoney),
            unit_id: l.unit.id,
            unit_title: l.unit.title,
            unit_price: toBigintSql(unitPrice),
            unit_compare_at_price: toBigintSql(compareAtPrice),
            unit_sku: l.unit.sku,
            unit_image_url: l.unit.imageUrl,
            unit_snapshot: knex.raw("?::jsonb", [JSON.stringify(l.unit.snapshot ?? null)]),
            metadata: knex.raw("?::jsonb", [JSON.stringify({})]),
            projected_version: 0,
            created_at: event.metadata.now,
            updated_at: event.metadata.now,
            deleted_at: null,
          };
        });

        const insertItemsSql = knex
          .withSchema("platform")
          .table("order_items")
          .insert(itemRows)
          .toString();
        statements.push(rawSql(insertItemsSql));
      }

      // Insert delivery groups
      const groups = event.data.deliveryGroups || [];
      if (groups.length > 0) {
        const groupRows = groups.map((g) => ({
          id: g.id,
          // TODO: Remove `as any` by aligning types with DB (UUID).
          project_id: projectId as any,
          order_id: orderId,
          selected_delivery_method: null,
          // TODO: Switch to parameterized uuid[] binding instead of interpolated literals.
          line_item_ids: uuidArray(g.orderLineIds),
          created_at: event.metadata.now,
          updated_at: event.metadata.now,
        }));

        // Knex doesn't support array literals directly in object values when batching.
        // Build VALUES list via raw inserts per row to preserve uuid[] type.
        const groupsInsert = groupRows.map((r) =>
          knex
            .withSchema("platform")
            .table("order_delivery_groups")
            .insert({
              id: r.id,
              project_id: r.project_id as any,
              order_id: r.order_id,
              selected_delivery_method: r.selected_delivery_method,
              line_item_ids: r.line_item_ids,
              created_at: r.created_at,
              updated_at: r.updated_at,
            })
            .toString(),
        );
        groupsInsert.forEach((sql) => statements.push(rawSql(sql)));
      }

      // Insert applied discounts
      const discounts = event.data.appliedDiscounts || [];
      if (discounts.length > 0) {
        const discountRows = discounts.map((d) => ({
          order_id: orderId,
          // TODO: Remove `as any` by aligning types with DB (UUID).
          project_id: projectId as any,
          code: d.code,
          discount_type: d.type,
          // TODO: Generalize money coercion: accept number/Money and bind as bigint parameter.
          value: typeof d.value === "number" ? String(d.value) : toBigintSql(d.value as unknown as Money),
          provider: d.provider,
          // TODO: Use shared `jsonb` helper for consistency.
          conditions: knex.raw("?::jsonb", [JSON.stringify(null)]),
          applied_at: d.appliedAt,
        }));

        const insertDiscountsSql = knex
          .withSchema("platform")
          .table("order_applied_discounts")
          .insert(discountRows)
          .toString();
        statements.push(rawSql(insertDiscountsSql));
      }

      if (projectionContext?.contact) {
        const { contact } = projectionContext;
        const contactSql = knex
          .withSchema("platform")
          .table("orders_pii_records")
          .insert({
            project_id: contact.projectId,
            order_id: orderId,
            customer_email: contact.customerEmail,
            customer_phone_e164: contact.customerPhoneE164,
            customer_note: contact.customerNote,
            expires_at: contact.expiresAt,
          })
          .onConflict(["order_id"])
          .merge({
            customer_email: knex.raw("EXCLUDED.customer_email"),
            customer_phone_e164: knex.raw("EXCLUDED.customer_phone_e164"),
            customer_note: knex.raw("EXCLUDED.customer_note"),
            expires_at: knex.raw("EXCLUDED.expires_at"),
            updated_at: knex.raw("?::timestamptz", [event.metadata.now]),
          })
          .toString();
        statements.push(rawSql(contactSql));
      }

      if (projectionContext?.deliveryAddresses.length) {
        const addressesSql = knex
          .withSchema("platform")
          .table("order_delivery_addresses")
          .insert(
            projectionContext.deliveryAddresses.map((address) => ({
              id: address.id,
              project_id: address.projectId,
              order_id: orderId,
              delivery_group_id: address.deliveryGroupId,
              address1: address.address1,
              address2: address.address2,
              city: address.city,
              country_code: address.countryCode,
              province_code: address.provinceCode,
              postal_code: address.postalCode,
              email: address.email,
              first_name: address.firstName,
              last_name: address.lastName,
              phone: address.phone,
              metadata: knex.raw("?::jsonb", [
                JSON.stringify(address.metadata ?? null),
              ]),
            }))
          )
          .toString();
        statements.push(rawSql(addressesSql));
      }

      sqls.push(...statements);
    }

    return sqls;
  }, "order.created");
