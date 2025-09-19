import { rawSql, type SQL } from "@event-driven-io/dumbo";
import { postgreSQLRawBatchSQLProjection } from "@event-driven-io/emmett-postgresql";
import type { Event } from "@event-driven-io/emmett";
import type {
  CheckoutLinesAddedPayload,
  CheckoutLinesClearedPayload,
  CheckoutLinesDeletedPayload,
  CheckoutLinesUpdatedPayload,
  CheckoutPromoCodeAddedPayload,
  CheckoutPromoCodeRemovedPayload,
} from "@src/domain/checkout/events";
import type { CheckoutCommandMetadata } from "@src/domain/checkout/commands";
import { knex } from "@src/infrastructure/db/knex";
import { Money } from "@shopana/shared-money";

type CheckoutLinesPayload =
  | CheckoutLinesAddedPayload
  | CheckoutLinesUpdatedPayload
  | CheckoutLinesDeletedPayload
  | CheckoutPromoCodeAddedPayload
  | CheckoutPromoCodeRemovedPayload;

type CheckoutLinesEvent = Event & {
  data: CheckoutLinesPayload;
  metadata: CheckoutCommandMetadata;
};

const buildCheckoutLinesUpsertStatements = (
  event: CheckoutLinesEvent,
): SQL[] => {
  const projectId = event.metadata.projectId;
  const checkoutId = event.metadata.aggregateId;

  const toBigintSql = (m: Money | null) =>
    m == null ? null : m.amountMinor().toString();

  const stmtSqls: string[] = [];

  // 1. Delete all existing lines for this checkout
  const deleteAllSql = knex
    .withSchema("platform")
    .table("checkout_line_items")
    .delete()
    .where({ checkout_id: checkoutId, project_id: projectId as any })
    .toString();

  stmtSqls.push(deleteAllSql);

  // 2. Insert all lines from event with current data
  if (event.data.checkoutLines.length > 0) {
    const values = event.data.checkoutLines.map((l) => {
      const cost = event.data.checkoutLinesCost[l.lineId];
      const qty = BigInt(l.quantity);
      const unitPriceMinor =
        cost && qty > 0n ? cost.subtotal.amountMinor() / qty : 0n;
      const unitPrice = Money.fromMinor(unitPriceMinor);

      return {
        id: l.lineId,
        project_id: projectId as any,
        checkout_id: checkoutId,
        quantity: l.quantity,
        subtotal_amount: toBigintSql(cost?.subtotal ?? null),
        discount_amount: toBigintSql(cost?.discount ?? null),
        tax_amount: toBigintSql(cost?.tax ?? null),
        total_amount: toBigintSql(cost?.total ?? null),
        unit_id: l.unit.id,
        unit_title: l.unit.title,
        unit_price: toBigintSql(unitPrice),
        unit_compare_at_price: toBigintSql(l.unit.compareAtPrice),
        unit_sku: l.unit.sku,
        unit_image_url: l.unit.imageUrl,
        unit_snapshot: knex.raw("?::jsonb", [
          JSON.stringify(l.unit.snapshot ?? {}),
        ]),
        metadata: null,
        projected_version: 0,
        created_at: event.metadata.now,
        updated_at: event.metadata.now,
        deleted_at: null,
      };
    });

    const insertSql = knex
      .withSchema("platform")
      .table("checkout_line_items")
      .insert(values)
      .toString();

    stmtSqls.push(insertSql);
  }

  // 3. Update checkout totals from event
  const updateCheckoutSql = knex
    .withSchema("platform")
    .table("checkouts")
    .where("id", checkoutId)
    .update({
      subtotal: toBigintSql(event.data.checkoutCost.subtotal),
      discount_total: toBigintSql(event.data.checkoutCost.discountTotal),
      tax_total: toBigintSql(event.data.checkoutCost.taxTotal),
      shipping_total: toBigintSql(event.data.checkoutCost.shippingTotal),
      grand_total: toBigintSql(event.data.checkoutCost.grandTotal),
      updated_at: knex.fn.now(),
    })
    .toString();

  stmtSqls.push(updateCheckoutSql);

  return stmtSqls.map((s) => rawSql(s));
};

type CheckoutLinesAddedEvent = Event & {
  type: "checkout.lines.added";
  data: CheckoutLinesAddedPayload;
  metadata: CheckoutCommandMetadata;
};

export const checkoutLineItemsProjection =
  postgreSQLRawBatchSQLProjection<CheckoutLinesAddedEvent>(
    (events) =>
      events.length ? events.flatMap(buildCheckoutLinesUpsertStatements) : [],
    "checkout.lines.added",
  );

type CheckoutLinesUpdatedEvent = Event & {
  type: "checkout.lines.updated";
  data: CheckoutLinesUpdatedPayload;
  metadata: CheckoutCommandMetadata;
};

export const checkoutLineItemsUpdatedProjection =
  postgreSQLRawBatchSQLProjection<CheckoutLinesUpdatedEvent>(
    (events) =>
      events.length ? events.flatMap(buildCheckoutLinesUpsertStatements) : [],
    "checkout.lines.updated",
  );

type CheckoutLinesDeletedEvent = Event & {
  type: "checkout.lines.deleted";
  data: CheckoutLinesDeletedPayload;
  metadata: CheckoutCommandMetadata;
};

export const checkoutLineItemsDeletedProjection =
  postgreSQLRawBatchSQLProjection<CheckoutLinesDeletedEvent>(
    (events) =>
      events.length ? events.flatMap(buildCheckoutLinesUpsertStatements) : [],
    "checkout.lines.deleted",
  );

type CheckoutLinesClearedEvent = Event & {
  type: "checkout.lines.cleared";
  data: CheckoutLinesClearedPayload;
  metadata: CheckoutCommandMetadata;
};

export const checkoutLineItemsClearedProjection =
  postgreSQLRawBatchSQLProjection<CheckoutLinesClearedEvent>((events) => {
    if (!events.length) return [];
    const sqls = events.flatMap((event) => {
      const projectId = event.metadata.projectId;
      const checkoutId = event.metadata.aggregateId;

      const toBigintSql = (m: Money | null) =>
        m == null ? null : m.amountMinor().toString();

      // 1. Delete all lines
      const deleteSql = knex
        .withSchema("platform")
        .table("checkout_line_items")
        .delete()
        .where({ checkout_id: checkoutId, project_id: projectId as any })
        .toString();

      // 2. Update checkout totals from event (should be zero)
      const updateCheckoutSql = knex
        .withSchema("platform")
        .table("checkouts")
        .where("id", checkoutId)
        .update({
          subtotal: toBigintSql(event.data.checkoutCost.subtotal),
          discount_total: toBigintSql(event.data.checkoutCost.discountTotal),
          tax_total: toBigintSql(event.data.checkoutCost.taxTotal),
          shipping_total: toBigintSql(event.data.checkoutCost.shippingTotal),
          grand_total: toBigintSql(event.data.checkoutCost.grandTotal),
          updated_at: knex.fn.now(),
        })
        .toString();

      return [rawSql(deleteSql), rawSql(updateCheckoutSql)];
    });

    return sqls;
  }, "checkout.lines.cleared");

type CheckoutPromoCodeAddedEvent = Event & {
  type: "checkout.promo.code.added";
  data: CheckoutPromoCodeAddedPayload;
  metadata: CheckoutCommandMetadata;
};

export const checkoutLineItemsPromoCodeAddedProjection =
  postgreSQLRawBatchSQLProjection<CheckoutPromoCodeAddedEvent>(
    (events) =>
      events.length ? events.flatMap(buildCheckoutLinesUpsertStatements) : [],
    "checkout.promo.code.added",
  );

type CheckoutPromoCodeRemovedEvent = Event & {
  type: "checkout.promo.code.removed";
  data: CheckoutPromoCodeRemovedPayload;
  metadata: CheckoutCommandMetadata;
};

export const checkoutLineItemsPromoCodeRemovedProjection =
  postgreSQLRawBatchSQLProjection<CheckoutPromoCodeRemovedEvent>(
    (events) =>
      events.length ? events.flatMap(buildCheckoutLinesUpsertStatements) : [],
    "checkout.promo.code.removed",
  );
