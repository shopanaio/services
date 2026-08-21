import { sql, type SQL } from "drizzle-orm";
import type {
  AdminOrderBulkFilterField,
  AdminOrderBulkFilterOperator,
  AdminOrderBulkPredicate,
  AdminOrderBulkSelection,
  AdminOrderBulkTarget,
} from "../../application/admin/AdminOrderBulkSelection.js";
import { BaseRepository } from "../BaseRepository.js";

export class AdminOrderBulkSelectionRepository extends BaseRepository {
  async findTargets(
    storeId: string,
    selection: AdminOrderBulkSelection,
  ): Promise<readonly AdminOrderBulkTarget[]> {
    const where = selection.predicate ? compileAdminOrderPredicate(selection.predicate) : null;
    return this.connection.execute<AdminOrderBulkTarget>(sql`
      SELECT current_order.id,
        COALESCE(array_agg(tag.tag ORDER BY tag.tag) FILTER (WHERE tag.tag IS NOT NULL), '{}') AS tags
      FROM orders.orders current_order
      LEFT JOIN orders.order_tags tag
        ON tag.store_id = current_order.store_id AND tag.order_id = current_order.id
      WHERE current_order.store_id = ${storeId}
        AND (${selection.ids}::uuid[] IS NULL OR current_order.id = ANY(${selection.ids}::uuid[]))
        AND NOT (current_order.id = ANY(${selection.excludedIds}::uuid[]))
        ${where ? sql`AND ${where}` : sql``}
      GROUP BY current_order.id, current_order.created_at
      ORDER BY current_order.created_at, current_order.id
      LIMIT 1000
    `);
  }
}

export function compileAdminOrderPredicate(predicate: AdminOrderBulkPredicate): SQL {
  if (predicate.kind === "and" || predicate.kind === "or") {
    const separator = predicate.kind === "and" ? sql` AND ` : sql` OR `;
    return sql`(${sql.join(predicate.predicates.map(compileAdminOrderPredicate), separator)})`;
  }
  if (predicate.kind === "boolean") {
    if (predicate.field === "archived") {
      return predicate.value
        ? sql`current_order.archived_at IS NOT NULL`
        : sql`current_order.archived_at IS NULL`;
    }
    const tracking = sql`EXISTS (
      SELECT 1 FROM orders.order_shipment_tracking_numbers tracking
      WHERE tracking.store_id = current_order.store_id
        AND tracking.order_id = current_order.id
    )`;
    return predicate.value ? tracking : sql`NOT (${tracking})`;
  }
  if (predicate.kind !== "comparison") {
    throw new Error("ORDER_BULK_FILTER_INVALID");
  }
  return compileComparison(predicate.field, predicate.operator, predicate.value);
}

function compileComparison(
  field: AdminOrderBulkFilterField,
  operator: AdminOrderBulkFilterOperator,
  value: string | readonly string[],
): SQL {
  const direct = directField(field);
  if (direct) return compare(direct.expression, operator, value, direct.type);

  switch (field) {
    case "placementStatus":
      return exists(
        "order_checkout_placements",
        compare(sql`related.status::text`, operator, value, "text"),
      );
    case "customerName":
      return exists(
        "order_contacts",
        compare(
          sql`concat_ws(' ', related.first_name, related.middle_name, related.last_name)`,
          operator,
          value,
          "text",
        ),
      );
    case "customerEmail":
      return exists("order_contacts", compare(sql`related.email`, operator, value, "text"));
    case "customerPhone":
      return exists("order_contacts", compare(sql`related.phone_e164`, operator, value, "text"));
    case "shippingCountry":
      return exists(
        "order_addresses",
        sql`related.type = 'SHIPPING' AND ${compare(sql`related.country_code`, operator, value, "text")}`,
      );
    case "deliveryMethodCode":
      return exists(
        "order_delivery_methods",
        sql`related.is_selected AND ${compare(sql`related.code`, operator, value, "text")}`,
      );
    case "paymentMethodCode":
      return exists(
        "order_payment_methods",
        sql`related.is_selected AND ${compare(sql`related.code`, operator, value, "text")}`,
      );
    case "tag":
      return exists("order_tags", compare(sql`related.tag`, operator, value, "text"));
    case "trackingNumber":
      return exists(
        "order_shipment_tracking_numbers",
        compare(sql`related.number`, operator, value, "text"),
      );
    default:
      throw new Error(`ORDER_BULK_FILTER_NOT_COMPILED:${field}`);
  }
}

function directField(
  field: AdminOrderBulkFilterField,
): Readonly<{ expression: SQL; type: "text" | "uuid" | "numeric" | "timestamp" }> | null {
  switch (field) {
    case "id":
      return { expression: sql`current_order.id`, type: "uuid" };
    case "number":
      return { expression: sql`current_order.order_number`, type: "numeric" };
    case "status":
      return { expression: sql`current_order.status::text`, type: "text" };
    case "paymentStatus":
      return { expression: sql`current_order.payment_status::text`, type: "text" };
    case "fulfillmentStatus":
      return { expression: sql`current_order.fulfillment_status::text`, type: "text" };
    case "deliveryStatus":
      return { expression: sql`current_order.delivery_status::text`, type: "text" };
    case "returnStatus":
      return { expression: sql`current_order.return_status::text`, type: "text" };
    case "customerId":
      return { expression: sql`current_order.customer_id`, type: "uuid" };
    case "externalId":
      return { expression: sql`current_order.external_id`, type: "text" };
    case "sourceCode":
      return {
        expression: sql`COALESCE(current_order.external_source, current_order.sales_channel)`,
        type: "text",
      };
    case "totalAmount":
      return {
        expression: adminOrderTotalMajorExpression(),
        type: "numeric",
      };
    case "currencyCode":
      return { expression: sql`current_order.currency_code`, type: "text" };
    case "createdAt":
      return { expression: sql`current_order.created_at`, type: "timestamp" };
    case "updatedAt":
      return { expression: sql`current_order.updated_at`, type: "timestamp" };
    case "placedAt":
      return { expression: sql`current_order.placed_at`, type: "timestamp" };
    default:
      return null;
  }
}

export function adminOrderTotalMajorExpression(): SQL {
  return sql`current_order.total_amount::numeric / CASE
    WHEN current_order.currency_code = ANY(ARRAY[
      'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF',
      'UGX', 'UYI', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
    ]) THEN 1
    WHEN current_order.currency_code = ANY(ARRAY[
      'BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND'
    ]) THEN 1000
    WHEN current_order.currency_code = ANY(ARRAY['CLF', 'UYW']) THEN 10000
    ELSE 100
  END`;
}

type RelatedTable =
  | "order_checkout_placements"
  | "order_contacts"
  | "order_addresses"
  | "order_delivery_methods"
  | "order_payment_methods"
  | "order_tags"
  | "order_shipment_tracking_numbers";

function exists(table: RelatedTable, predicate: SQL): SQL {
  return sql`EXISTS (
    SELECT 1 FROM ${sql.raw(`orders.${table}`)} related
    WHERE related.store_id = current_order.store_id
      AND related.order_id = current_order.id
      AND ${predicate}
  )`;
}

function compare(
  expression: SQL,
  operator: AdminOrderBulkFilterOperator,
  value: string | readonly string[],
  type: "text" | "uuid" | "numeric" | "timestamp",
): SQL {
  if (operator === "contains") return sql`${expression} LIKE ${`%${value as string}%`}`;
  if (operator === "startsWith") return sql`${expression} LIKE ${`${value as string}%`}`;
  if (operator === "in" || operator === "notIn") {
    const condition = sql`${expression} = ANY(${value as readonly string[]}::${sql.raw(`${type}[]`)})`;
    return operator === "in" ? condition : sql`NOT (${condition})`;
  }
  const right = sql`${value as string}::${sql.raw(type === "timestamp" ? "timestamptz" : type)}`;
  switch (operator) {
    case "eq":
      return sql`${expression} = ${right}`;
    case "gt":
      return sql`${expression} > ${right}`;
    case "gte":
      return sql`${expression} >= ${right}`;
    case "lt":
      return sql`${expression} < ${right}`;
    case "lte":
      return sql`${expression} <= ${right}`;
    default:
      throw new Error(`ORDER_BULK_FILTER_OPERATOR_NOT_COMPILED:${operator}`);
  }
}
