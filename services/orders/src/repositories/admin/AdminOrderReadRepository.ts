import { sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";

export type AdminOrderListInput = Readonly<{
  storeId: string;
  first?: number;
  after?: Readonly<{ at: string; id: string }>;
  statuses?: readonly ("DRAFT" | "OPEN" | "CLOSED" | "CANCELLED")[];
  paymentStatuses?: readonly string[];
  fulfillmentStatuses?: readonly string[];
  archived?: boolean;
  customerId?: string;
  query?: string;
  sort?: "CREATED_AT_ASC" | "CREATED_AT_DESC" | "UPDATED_AT_ASC" | "UPDATED_AT_DESC";
}>;

export type AdminOrderListRow = Readonly<{
  id: string;
  orderNumber: string;
  version: number;
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
}>;

/** Canonical tenant-scoped Admin projections. Current state is never rebuilt from event replay. */
export class AdminOrderReadRepository extends BaseRepository {
  async findDetail(storeId: string, orderId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.connection.execute<Record<string, unknown>>(sql`
      SELECT current_order.*,
        COALESCE(lines.value, '[]'::jsonb) AS lines,
        COALESCE(tags.value, '[]'::jsonb) AS tags,
        contact.value AS contact,
        COALESCE(fulfillment_orders.value, '[]'::jsonb) AS fulfillment_orders,
        COALESCE(shipments.value, '[]'::jsonb) AS shipments,
        COALESCE(returns.value, '[]'::jsonb) AS returns
      FROM orders.orders current_order
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(to_jsonb(line) ORDER BY line.created_at, line.id) AS value
        FROM orders.order_lines line
        WHERE line.store_id = current_order.store_id AND line.order_id = current_order.id
      ) lines ON true
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(tag.tag ORDER BY tag.tag) AS value
        FROM orders.order_tags tag
        WHERE tag.store_id = current_order.store_id AND tag.order_id = current_order.id
      ) tags ON true
      LEFT JOIN LATERAL (
        SELECT to_jsonb(contact) - 'store_id' - 'order_id' AS value
        FROM orders.order_contacts contact
        WHERE contact.store_id = current_order.store_id AND contact.order_id = current_order.id
      ) contact ON true
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(to_jsonb(item) ORDER BY item.created_at, item.id) AS value
        FROM orders.order_fulfillment_orders item
        WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id
      ) fulfillment_orders ON true
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(to_jsonb(item) ORDER BY item.created_at, item.id) AS value
        FROM orders.order_shipments item
        WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id
      ) shipments ON true
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(to_jsonb(item) ORDER BY item.created_at, item.id) AS value
        FROM orders.order_return_requests item
        WHERE item.store_id = current_order.store_id AND item.order_id = current_order.id
      ) returns ON true
      WHERE current_order.store_id = ${storeId} AND current_order.id = ${orderId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async list(input: AdminOrderListInput): Promise<{
    nodes: readonly AdminOrderListRow[];
    hasNextPage: boolean;
  }> {
    const limit = Math.min(Math.max(input.first ?? 50, 1), 250);
    const query = input.query?.trim() || null;
    const statuses = input.statuses?.length ? [...input.statuses] : null;
    const paymentStatuses = input.paymentStatuses?.length ? [...input.paymentStatuses] : null;
    const fulfillmentStatuses = input.fulfillmentStatuses?.length
      ? [...input.fulfillmentStatuses]
      : null;
    const ascending = input.sort === "CREATED_AT_ASC" || input.sort === "UPDATED_AT_ASC";
    const byUpdated = input.sort === "UPDATED_AT_ASC" || input.sort === "UPDATED_AT_DESC";
    const cursorAt = input.after?.at ?? null;
    const cursorId = input.after?.id ?? null;
    const rows = await this.connection.execute<AdminOrderListRow>(sql`
      SELECT id, order_number::text AS "orderNumber", version, status,
        payment_status AS "paymentStatus", fulfillment_status AS "fulfillmentStatus",
        delivery_status AS "deliveryStatus", return_status AS "returnStatus",
        customer_id AS "customerId", currency_code AS "currencyCode",
        total_amount::text AS "totalAmount", archived_at::text AS "archivedAt",
        created_at::text AS "createdAt", updated_at::text AS "updatedAt"
      FROM orders.orders
      WHERE store_id = ${input.storeId}
        AND (${statuses}::orders.order_status[] IS NULL OR status = ANY(${statuses}::orders.order_status[]))
        AND (${paymentStatuses}::orders.order_payment_status[] IS NULL OR payment_status = ANY(${paymentStatuses}::orders.order_payment_status[]))
        AND (${fulfillmentStatuses}::orders.order_fulfillment_status[] IS NULL OR fulfillment_status = ANY(${fulfillmentStatuses}::orders.order_fulfillment_status[]))
        AND (${input.archived ?? null}::boolean IS NULL OR (archived_at IS NOT NULL) = ${input.archived ?? null})
        AND (${input.customerId ?? null}::uuid IS NULL OR customer_id = ${input.customerId ?? null}::uuid)
        AND (${query}::text IS NULL OR order_number::text = ${query} OR external_id = ${query})
        AND (${cursorAt}::timestamptz IS NULL OR
          CASE WHEN ${ascending}
            THEN (CASE WHEN ${byUpdated} THEN updated_at ELSE created_at END, id) > (${cursorAt}::timestamptz, ${cursorId}::uuid)
            ELSE (CASE WHEN ${byUpdated} THEN updated_at ELSE created_at END, id) < (${cursorAt}::timestamptz, ${cursorId}::uuid)
          END)
      ORDER BY
        CASE WHEN ${ascending} AND ${byUpdated} THEN updated_at END ASC,
        CASE WHEN ${ascending} AND NOT ${byUpdated} THEN created_at END ASC,
        CASE WHEN NOT ${ascending} AND ${byUpdated} THEN updated_at END DESC,
        CASE WHEN NOT ${ascending} AND NOT ${byUpdated} THEN created_at END DESC,
        id ${sql.raw(ascending ? "ASC" : "DESC")}
      LIMIT ${limit + 1}
    `);
    return { nodes: rows.slice(0, limit), hasNextPage: rows.length > limit };
  }

  async activity(storeId: string, orderId: string, afterSequence = 0, first = 100) {
    const limit = Math.min(Math.max(first, 1), 250);
    return this.connection.execute<Record<string, unknown>>(sql`
      SELECT id, sequence, order_id AS "orderId", order_version AS "orderVersion",
        activity_type AS "activityType", visibility, actor_type AS "actorType",
        actor_id AS "actorId", message, payload, happened_at::text AS "happenedAt"
      FROM orders.order_activity
      WHERE store_id = ${storeId} AND order_id = ${orderId} AND sequence > ${afterSequence}
      ORDER BY sequence ASC LIMIT ${limit}
    `);
  }

  async operation(storeId: string, operationId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.connection.execute<Record<string, unknown>>(sql`
      SELECT * FROM orders.order_operations
      WHERE store_id = ${storeId} AND id = ${operationId} LIMIT 1
    `);
    return rows[0] ?? null;
  }
}
