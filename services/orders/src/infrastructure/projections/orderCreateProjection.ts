import { rawSql } from "@event-driven-io/dumbo";
import { postgreSQLRawBatchSQLProjection } from "@event-driven-io/emmett-postgresql";
import type { Event } from "@event-driven-io/emmett";
import type { OrderCreatedPayload } from "@src/domain/order/events";
import { knex } from "@src/infrastructure/db/knex";
import { Money } from "@shopana/shared-money";
import { OrderCommandMetadata } from "@src/domain/order/commands";

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
  postgreSQLRawBatchSQLProjection<OrderCreatedEvent>((events) => {
    const sqls = events.flatMap((event) => {
      const statements: ReturnType<typeof rawSql>[] = [];

      const projectId = event.metadata.projectId;
      const orderId = event.metadata.aggregateId;

      // Insert order head
      const insertOrderSql = knex
        .withSchema("platform")
        .table("orders")
        .insert({
          id: orderId,
          // TODO: Remove `as any` by aligning metadata type with DB schema (UUID/text).
          project_id: projectId as any,
          order_number: null,
          api_key_id: null,
          user_id: event.metadata.userId ?? null,
          sales_channel: event.data.salesChannel,
          external_source: event.data.externalSource,
          external_id: event.data.externalId,
          // TODO: Remove `as any` by using a proper branded/string type compatible with DB column.
          locale_code: event.data.localeCode as any,
          currency_code: event.data.currencyCode,
          // TODO: Use parameterized bindings for bigint values instead of strings.
          subtotal_amount: toBigintSql(event.data.subtotalAmount) ?? null,
          total_shipping_amount: toBigintSql(event.data.totalShippingAmount) ?? null,
          total_discount_amount: toBigintSql(event.data.totalDiscountAmount) ?? null,
          total_tax_amount: toBigintSql(event.data.totalTaxAmount) ?? null,
          total_amount: toBigintSql(event.data.totalAmount) ?? null,
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
        const itemRows = lines.map((l) => ({
          id: l.lineId,
          // TODO: Remove `as any` by aligning types with DB (UUID).
          project_id: projectId as any,
          order_id: orderId,
          quantity: l.quantity,
          // TODO: Consider denormalizing amounts now or add note where they are computed later.
          subtotal_amount: null,
          discount_amount: null,
          tax_amount: null,
          total_amount: null,
          unit_id: l.unit.id,
          unit_title: l.unit.title,
          // TODO: Avoid casts; make `toBigintSql` accept number/Money safely.
          unit_price: toBigintSql(l.unit.price as unknown as Money),
          unit_compare_at_price: l.unit.compareAtPrice
            ? toBigintSql(l.unit.compareAtPrice as unknown as Money)
            : null,
          unit_sku: l.unit.sku,
          unit_image_url: l.unit.imageUrl,
          // TODO: Use shared `jsonb` helper for consistency across inserts.
          unit_snapshot: knex.raw("?::jsonb", [JSON.stringify(l.unit.snapshot ?? null)]),
          metadata: knex.raw("?::jsonb", [JSON.stringify({})]),
          projected_version: 0,
          created_at: event.metadata.now,
          updated_at: event.metadata.now,
          deleted_at: null,
        }));

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

      return statements;
    });

    return sqls;
  }, "order.created");
