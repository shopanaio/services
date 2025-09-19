import { rawSql, type SQL } from "@event-driven-io/dumbo";
import { postgreSQLRawBatchSQLProjection } from "@event-driven-io/emmett-postgresql";
import type { Event } from "@event-driven-io/emmett";
import type {
  CheckoutPromoCodeAddedPayload,
  CheckoutPromoCodeRemovedPayload,
} from "@src/domain/checkout/events";
import type { CheckoutCommandMetadata } from "@src/domain/checkout/commands";
import { knex } from "@src/infrastructure/db/knex";

type CheckoutPromoCodeEvent = Event & {
  data: CheckoutPromoCodeAddedPayload | CheckoutPromoCodeRemovedPayload;
  metadata: CheckoutCommandMetadata;
};

const buildAppliedDiscountsUpsertStatements = (
  event: CheckoutPromoCodeEvent,
): SQL[] => {
  const projectId = event.metadata.projectId;
  const checkoutId = event.metadata.aggregateId;

  const stmtSqls: string[] = [];

  // 1. Delete all existing discounts for this checkout
  const deleteAllSql = knex
    .withSchema("platform")
    .table("checkout_applied_discounts")
    .delete()
    .where({ checkout_id: checkoutId, project_id: projectId as any })
    .toString();

  stmtSqls.push(deleteAllSql);

  // 2. Insert all discounts from event
  if (event.data.appliedDiscounts.length > 0) {
    const values = event.data.appliedDiscounts.map((d) => {
      return {
        checkout_id: checkoutId,
        project_id: projectId as any,
        code: d.code,
        discount_type: d.type,
        value: d.value,
        provider: d.provider,
        applied_at: d.appliedAt,
      };
    });

    const insertSql = knex
      .withSchema("platform")
      .table("checkout_applied_discounts")
      .insert(values)
      .toString();

    stmtSqls.push(insertSql);
  }

  return stmtSqls.map((s) => rawSql(s));
};

type CheckoutPromoCodeAddedEvent = Event & {
  type: "checkout.promo.code.added";
  data: CheckoutPromoCodeAddedPayload;
  metadata: CheckoutCommandMetadata;
};

export const checkoutAppliedDiscountsAddedProjection =
  postgreSQLRawBatchSQLProjection<CheckoutPromoCodeAddedEvent>(
    (events) =>
      events.length
        ? events.flatMap(buildAppliedDiscountsUpsertStatements)
        : [],
    "checkout.promo.code.added",
  );

type CheckoutPromoCodeRemovedEvent = Event & {
  type: "checkout.promo.code.removed";
  data: CheckoutPromoCodeRemovedPayload;
  metadata: CheckoutCommandMetadata;
};

export const checkoutAppliedDiscountsRemovedProjection =
  postgreSQLRawBatchSQLProjection<CheckoutPromoCodeRemovedEvent>(
    (events) =>
      events.length
        ? events.flatMap(buildAppliedDiscountsUpsertStatements)
        : [],
    "checkout.promo.code.removed",
  );
