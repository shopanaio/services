import { sql, type SQL } from "drizzle-orm";
import type { AdminOrderBulkPredicate } from "../../application/admin/AdminOrderBulkSelection.js";
import { BaseRepository } from "../BaseRepository.js";
import {
  adminOrderTotalMajorExpression,
  compileAdminOrderPredicate,
} from "./AdminOrderBulkSelectionRepository.js";

export type AdminOrderListInput = Readonly<{
  storeId: string;
  first?: number;
  after?: Readonly<{ id: string }>;
  statuses?: readonly ("DRAFT" | "OPEN" | "CLOSED" | "CANCELLED")[];
  paymentStatuses?: readonly string[];
  fulfillmentStatuses?: readonly string[];
  archived?: boolean | null;
  predicate?: AdminOrderBulkPredicate;
  sort?: AdminOrderSort;
}>;

export type AdminOrderSort = `${
  | "NUMBER"
  | "CUSTOMER_NAME"
  | "TOTAL_AMOUNT"
  | "STATUS"
  | "PAYMENT_STATUS"
  | "FULFILLMENT_STATUS"
  | "DELIVERY_STATUS"
  | "CREATED_AT"
  | "UPDATED_AT"
  | "PLACED_AT"}_${"ASC" | "DESC"}`;

export type AdminOrderListRow = Readonly<{
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  deliveryStatus: string;
  returnStatus: string;
  customerId: string | null;
  currencyCode: string;
  totalAmount: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  placedAt: string | null;
  sortKey: string;
}>;

/** Canonical tenant-scoped Admin projections. Current state is never rebuilt from event replay. */
export class AdminOrderReadRepository extends BaseRepository {
  async findDetails(
    storeId: string,
    orderIds: readonly string[],
  ): Promise<readonly Record<string, unknown>[]> {
    if (orderIds.length === 0) return [];
    return this.connection.execute<Record<string, unknown>>(sql`
      SELECT current_order.*,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.created_at, item.id)
          FROM orders.order_lines item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS lines,
        COALESCE((SELECT jsonb_agg(item.tag ORDER BY item.tag)
          FROM orders.order_tags item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS tags,
        (SELECT to_jsonb(item) - 'store_id' - 'order_id'
          FROM orders.order_contacts item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id) AS contact,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.id)
          FROM orders.order_addresses item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS addresses,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.applied_at, item.id)
          FROM orders.order_discount_applications item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS discounts,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.id)
          FROM orders.order_line_tax_lines item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS tax_lines,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.created_at, item.id)
          FROM orders.order_delivery_groups item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS delivery_groups,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.created_at, item.id)
          FROM orders.order_delivery_methods item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS delivery_methods,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.delivery_group_id, item.order_line_id)
          FROM orders.order_delivery_group_lines item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS delivery_group_lines,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.id)
          FROM orders.order_recipients item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS recipients,
        (SELECT to_jsonb(item) - 'store_id' - 'order_id'
          FROM orders.order_checkout_placements item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id) AS checkout_placement,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.created_at, item.id)
          FROM orders.order_payment_methods item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS payment_methods,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.created_at, item.id)
          FROM orders.order_payment_attempts item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS payment_attempts,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.created_at, item.sequence)
          FROM orders.order_payment_transactions item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS payment_transactions,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.created_at, item.id)
          FROM orders.order_payment_disputes item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS payment_disputes,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.created_at, item.id)
          FROM orders.order_fulfillment_orders item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS fulfillment_orders,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.fulfillment_order_id, item.order_line_id)
          FROM orders.order_fulfillment_order_lines item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS fulfillment_order_lines,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.created_at, item.id)
          FROM orders.order_fulfillment_holds item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS fulfillment_holds,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.created_at, item.id)
          FROM orders.order_fulfillments item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS fulfillments,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.fulfillment_id, item.order_line_id)
          FROM orders.order_fulfillment_lines item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS fulfillment_lines,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.created_at, item.id)
          FROM orders.order_shipments item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS shipments,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.created_at, item.id)
          FROM orders.order_shipment_tracking_numbers item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS shipment_tracking_numbers,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.happened_at, item.sequence)
          FROM orders.order_shipment_tracking_events item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS shipment_tracking_events,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.id)
          FROM orders.order_shipment_packages item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS shipment_packages,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.package_id, item.order_line_id)
          FROM orders.order_shipment_package_lines item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS shipment_package_lines,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.created_at, item.id)
          FROM orders.order_return_requests item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS returns,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.id)
          FROM orders.order_return_request_lines item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS return_lines,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.created_at, item.id)
          FROM orders.order_exchanges item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS exchanges,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.exchange_id, item.return_request_line_id)
          FROM orders.order_exchange_inbound_lines item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS exchange_inbound_lines,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.exchange_id, item.id)
          FROM orders.order_exchange_outbound_lines item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS exchange_outbound_lines,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.created_at, item.id)
          FROM orders.order_refunds item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS refunds,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.id)
          FROM orders.order_refund_lines item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS refund_lines,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.refund_id, item.transaction_id)
          FROM orders.order_refund_transaction_allocations item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS refund_transaction_allocations,
        COALESCE((SELECT jsonb_agg(to_jsonb(item) ORDER BY item.created_at, item.id)
          FROM orders.order_integration_links item WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id), '[]'::jsonb) AS integration_links,
        (SELECT item.body FROM orders.order_admin_notes item
          WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id
          ORDER BY item.updated_at DESC, item.id DESC LIMIT 1) AS admin_note
      FROM orders.orders current_order
      WHERE current_order.store_id = ${storeId}
        AND current_order.id = ANY(${[...orderIds]}::uuid[])
    `);
  }

  async findByNumber(
    storeId: string,
    orderNumber: string,
  ): Promise<Record<string, unknown> | null> {
    const rows = await this.connection.execute<{ id: string }>(sql`
      SELECT id FROM orders.orders
      WHERE store_id = ${storeId} AND order_number = ${orderNumber}::bigint
      LIMIT 1
    `);
    if (!rows[0]) return null;
    return (await this.findDetails(storeId, [rows[0].id]))[0] ?? null;
  }

  async findDetail(storeId: string, orderId: string): Promise<Record<string, unknown> | null> {
    return (await this.findDetails(storeId, [orderId]))[0] ?? null;
  }
  async list(input: AdminOrderListInput): Promise<{
    nodes: readonly AdminOrderListRow[];
    hasNextPage: boolean;
  }> {
    const limit = Math.min(Math.max(input.first ?? 50, 1), 250);
    const predicate = input.predicate ? compileAdminOrderPredicate(input.predicate) : null;
    const statuses = input.statuses?.length ? [...input.statuses] : null;
    const paymentStatuses = input.paymentStatuses?.length ? [...input.paymentStatuses] : null;
    const fulfillmentStatuses = input.fulfillmentStatuses?.length
      ? [...input.fulfillmentStatuses]
      : null;
    const ascending = input.sort?.endsWith("_ASC") ?? false;
    const sortKey = orderSortExpression(input.sort ?? "CREATED_AT_DESC");
    const cursorId = input.after?.id ?? null;
    const archived = input.archived ?? null;
    const rows = await this.connection.execute<AdminOrderListRow>(sql`
      WITH cursor_position AS (
        SELECT ${sortKey} AS key
        FROM orders.orders current_order
        WHERE current_order.store_id = ${input.storeId}
          AND current_order.id = ${cursorId}::uuid
      )
      SELECT id, order_number::text AS "orderNumber", status,
        payment_status AS "paymentStatus", fulfillment_status AS "fulfillmentStatus",
        delivery_status AS "deliveryStatus", return_status AS "returnStatus",
        customer_id AS "customerId", currency_code AS "currencyCode",
        total_amount::text AS "totalAmount", archived_at::text AS "archivedAt",
        created_at::text AS "createdAt", updated_at::text AS "updatedAt",
        placed_at::text AS "placedAt", ${sortKey} AS "sortKey"
      FROM orders.orders current_order
      WHERE current_order.store_id = ${input.storeId}
        AND (${statuses}::orders.order_status[] IS NULL OR status = ANY(${statuses}::orders.order_status[]))
        AND (${paymentStatuses}::orders.order_payment_status[] IS NULL OR payment_status = ANY(${paymentStatuses}::orders.order_payment_status[]))
        AND (${fulfillmentStatuses}::orders.order_fulfillment_status[] IS NULL OR fulfillment_status = ANY(${fulfillmentStatuses}::orders.order_fulfillment_status[]))
        AND (${archived}::boolean IS NULL OR (archived_at IS NOT NULL) = ${archived})
        ${predicate ? sql`AND ${predicate}` : sql``}
        AND (${cursorId}::uuid IS NULL OR
          CASE WHEN ${ascending}
            THEN (${sortKey}, id) > ((SELECT key FROM cursor_position), ${cursorId}::uuid)
            ELSE (${sortKey}, id) < ((SELECT key FROM cursor_position), ${cursorId}::uuid)
          END)
      ORDER BY "sortKey" ${sql.raw(ascending ? "ASC" : "DESC")},
        id ${sql.raw(ascending ? "ASC" : "DESC")}
      LIMIT ${limit + 1}
    `);
    return { nodes: rows.slice(0, limit), hasNextPage: rows.length > limit };
  }

  async count(input: Omit<AdminOrderListInput, "after" | "first" | "sort">): Promise<number> {
    const predicate = input.predicate ? compileAdminOrderPredicate(input.predicate) : null;
    const statuses = input.statuses?.length ? [...input.statuses] : null;
    const paymentStatuses = input.paymentStatuses?.length ? [...input.paymentStatuses] : null;
    const fulfillmentStatuses = input.fulfillmentStatuses?.length
      ? [...input.fulfillmentStatuses]
      : null;
    const archived = input.archived ?? null;
    const rows = await this.connection.execute<{ count: string }>(sql`
      SELECT count(*)::text AS count
      FROM orders.orders current_order
      WHERE current_order.store_id = ${input.storeId}
        AND (${statuses}::orders.order_status[] IS NULL OR status = ANY(${statuses}::orders.order_status[]))
        AND (${paymentStatuses}::orders.order_payment_status[] IS NULL OR payment_status = ANY(${paymentStatuses}::orders.order_payment_status[]))
        AND (${fulfillmentStatuses}::orders.order_fulfillment_status[] IS NULL OR fulfillment_status = ANY(${fulfillmentStatuses}::orders.order_fulfillment_status[]))
        AND (${archived}::boolean IS NULL OR (archived_at IS NOT NULL) = ${archived})
        ${predicate ? sql`AND ${predicate}` : sql``}
    `);
    return Number(rows[0]?.count ?? 0);
  }

  async editSession(storeId: string, editId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.connection.execute<Record<string, unknown>>(sql`
      SELECT session.*,
        COALESCE(changes.value, '[]'::jsonb) AS changes
      FROM orders.order_edit_sessions session
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(to_jsonb(change) ORDER BY change.sequence) AS value
        FROM orders.order_edit_changes change
        WHERE change.store_id = session.store_id AND change.edit_session_id = session.id
      ) changes ON true
      WHERE session.store_id = ${storeId} AND session.id = ${editId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async editSessions(
    storeId: string,
    editIds: readonly string[],
  ): Promise<readonly Record<string, unknown>[]> {
    if (editIds.length === 0) return [];
    return this.connection.execute<Record<string, unknown>>(sql`
      SELECT session.*,
        COALESCE(changes.value, '[]'::jsonb) AS changes
      FROM orders.order_edit_sessions session
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(to_jsonb(change) ORDER BY change.sequence) AS value
        FROM orders.order_edit_changes change
        WHERE change.store_id = session.store_id AND change.edit_session_id = session.id
      ) changes ON true
      WHERE session.store_id = ${storeId} AND session.id = ANY(${[...editIds]}::uuid[])
    `);
  }

  async activity(storeId: string, orderId: string, afterSequence = 0, first = 100) {
    const limit = Math.min(Math.max(first, 1), 251);
    return this.connection.execute<Record<string, unknown>>(sql`
      SELECT id, global_position AS sequence, order_id AS "orderId",
        activity_type AS "activityType", visibility, actor_type AS "actorType",
        actor_id AS "actorId", message, payload, happened_at::text AS "happenedAt",
        recorded_at::text AS "recordedAt"
      FROM orders.order_activity
      WHERE store_id = ${storeId} AND order_id = ${orderId}
        AND global_position > ${afterSequence}
      ORDER BY global_position ASC LIMIT ${limit}
    `);
  }

  async activityCount(storeId: string, orderId: string): Promise<number> {
    const rows = await this.connection.execute<{ count: string }>(sql`
      SELECT count(*)::text AS count
      FROM orders.order_activity
      WHERE store_id = ${storeId} AND order_id = ${orderId}
    `);
    return Number(rows[0]?.count ?? 0);
  }

  async activityEntry(
    storeId: string,
    orderId: string,
    activityId: string,
  ): Promise<Record<string, unknown> | null> {
    const rows = await this.connection.execute<Record<string, unknown>>(sql`
      SELECT id, global_position AS sequence, order_id AS "orderId",
        activity_type AS "activityType", visibility,
        actor_type AS "actorType", actor_id AS "actorId", message, payload,
        happened_at::text AS "happenedAt", recorded_at::text AS "recordedAt"
      FROM orders.order_activity
      WHERE store_id = ${storeId} AND order_id = ${orderId} AND id = ${activityId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async operation(storeId: string, operationId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.connection.execute<Record<string, unknown>>(sql`
      SELECT * FROM orders.order_operations
      WHERE store_id = ${storeId} AND id = ${operationId} LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async operations(
    storeId: string,
    operationIds: readonly string[],
  ): Promise<readonly Record<string, unknown>[]> {
    if (operationIds.length === 0) return [];
    return this.connection.execute<Record<string, unknown>>(sql`
      SELECT * FROM orders.order_operations
      WHERE store_id = ${storeId} AND id = ANY(${[...operationIds]}::uuid[])
    `);
  }
}

function orderSortExpression(sort: AdminOrderSort): SQL {
  const field = sort.replace(/_(ASC|DESC)$/, "");
  switch (field) {
    case "NUMBER":
      return sql`lpad(current_order.order_number::text, 30, '0')`;
    case "CUSTOMER_NAME":
      return sql`lower(COALESCE((SELECT concat_ws(' ', contact.first_name, contact.middle_name, contact.last_name)
        FROM orders.order_contacts contact
        WHERE contact.store_id = current_order.store_id AND contact.order_id = current_order.id), ''))`;
    case "TOTAL_AMOUNT":
      return adminOrderTotalMajorExpression();
    case "STATUS":
      return sql`current_order.status::text`;
    case "PAYMENT_STATUS":
      return sql`current_order.payment_status::text`;
    case "FULFILLMENT_STATUS":
      return sql`current_order.fulfillment_status::text`;
    case "DELIVERY_STATUS":
      return sql`current_order.delivery_status::text`;
    case "UPDATED_AT":
      return sql`current_order.updated_at::text`;
    case "PLACED_AT":
      return sql`COALESCE(current_order.placed_at::text, '')`;
    default:
      return sql`current_order.created_at::text`;
  }
}
