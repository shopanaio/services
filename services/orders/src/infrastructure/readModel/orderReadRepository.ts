import type { SQLExecutor } from "@event-driven-io/dumbo";
import { rawSql, singleOrNull } from "@event-driven-io/dumbo";
import { dumboPool } from "@src/infrastructure/db/dumbo";
import { knex } from "@src/infrastructure/db/knex";
import type {
  OrderReadPort,
  OrderReadPortRow,
  OrderDeliveryAddressRow,
  OrderPromoCodeRow,
  OrderDeliveryGroupRow,
  OrderDeliveryGroup,
  OrderPromoCode,
} from "@src/application/read/orderReadRepository";

export class OrderReadRepository implements OrderReadPort {
  private readonly execute: SQLExecutor;

  constructor(executor: SQLExecutor = dumboPool.execute) {
    this.execute = executor;
  }

  async findById(id: string): Promise<OrderReadPortRow | null> {
    const q = knex
      .withSchema("platform")
      .table({ o: "orders" })
      .leftJoin({ pii: "orders_pii_records" }, "pii.order_id", "o.id")
      .select(
        "o.id",
        "o.project_id",
        "o.api_key_id",
        "o.user_id",
        "o.sales_channel",
        "o.external_source",
        "o.order_number",
        "o.external_id",
        "o.locale_code",
        "o.currency_code",
        "o.subtotal_amount",
        "o.total_shipping_amount",
        "o.total_discount_amount",
        "o.total_tax_amount",
        "o.total_amount",
        "o.status",
        "o.expires_at",
        "o.projected_version",
        "o.metadata",
        "o.created_at",
        "o.updated_at",
        "o.deleted_at",
        "pii.customer_email",
        "pii.customer_phone_e164",
        "pii.customer_note"
      )
      .where("o.id", id)
      .toString();

    const row = await singleOrNull(
      this.execute.query<OrderReadPortRow>(rawSql(q))
    );
    return this.mapOrderRow(row, id);
  }

  async findByOrderNumber(
    orderNumber: number,
    projectId: string
  ): Promise<OrderReadPortRow | null> {
    const q = knex
      .withSchema("platform")
      .table({ o: "orders" })
      .leftJoin({ pii: "orders_pii_records" }, "pii.order_id", "o.id")
      .select(
        "o.id",
        "o.project_id",
        "o.api_key_id",
        "o.user_id",
        "o.sales_channel",
        "o.external_source",
        "o.order_number",
        "o.external_id",
        "o.locale_code",
        "o.currency_code",
        "o.subtotal_amount",
        "o.total_shipping_amount",
        "o.total_discount_amount",
        "o.total_tax_amount",
        "o.total_amount",
        "o.status",
        "o.expires_at",
        "o.projected_version",
        "o.metadata",
        "o.created_at",
        "o.updated_at",
        "o.deleted_at",
        "pii.customer_email",
        "pii.customer_phone_e164",
        "pii.customer_note"
      )
      .where({
        "o.project_id": projectId,
        "o.order_number": orderNumber,
      })
      .toString();

    const row = await singleOrNull(
      this.execute.query<OrderReadPortRow>(rawSql(q))
    );
    return this.mapOrderRow(row);
  }

  async findDeliveryAddresses(
    orderId: string
  ): Promise<OrderDeliveryAddressRow[]> {
    const q = knex
      .withSchema("platform")
      .table("order_delivery_addresses as da")
      .join("order_delivery_groups as dg", "dg.id", "da.delivery_group_id")
      .select(
        "da.id",
        "da.delivery_group_id",
        "da.address1",
        "da.address2",
        "da.city",
        "da.country_code",
        "da.province_code",
        "da.postal_code",
        "da.first_name",
        "da.last_name",
        "da.email",
        "da.phone",
        "da.metadata",
        "da.created_at",
        "da.updated_at"
      )
      .where("dg.order_id", orderId)
      .orderBy("da.created_at", "asc")
      .toString();

    const result = await this.execute.query<OrderDeliveryAddressRow>(
      rawSql(q)
    );
    return result.rows;
  }

  async findAppliedPromoCodes(
    orderId: string
  ): Promise<OrderPromoCode[]> {
    const q = knex
      .withSchema("platform")
      .table("order_applied_discounts")
      .select(
        "order_id",
        "project_id",
        "code",
        "discount_type",
        "value",
        "provider",
        "conditions",
        "applied_at"
      )
      .where({ order_id: orderId })
      .orderBy("applied_at", "asc")
      .toString();

    const result = await this.execute.query<OrderPromoCodeRow>(rawSql(q));
    return result.rows.map(
      (row): OrderPromoCode => ({
        orderId: row.order_id,
        projectId: row.project_id,
        code: row.code,
        discountType: row.discount_type,
        value: parseInt(row.value, 10), // Convert bigint string to number
        provider: row.provider,
        conditions: row.conditions,
        appliedAt: row.applied_at,
      })
    );
  }

  async findDeliveryGroups(
    orderId: string
  ): Promise<OrderDeliveryGroup[]> {
    const q = knex
      .withSchema("platform")
      .table("order_delivery_groups")
      .select(
        "id",
        "project_id",
        "order_id",
        "selected_delivery_method",
        knex.raw("COALESCE(line_item_ids::text[], '{}') as line_item_ids"),
        "created_at",
        "updated_at"
      )
      .where({ order_id: orderId })
      .orderBy("created_at", "asc")
      .toString();

    const result = await this.execute.query<OrderDeliveryGroupRow>(
      rawSql(q)
    );
    return result.rows.map(
      (group): OrderDeliveryGroup => ({
        id: group.id,
        projectId: group.project_id,
        orderId: group.order_id,
        selectedDeliveryMethod: group.selected_delivery_method,
        lineItemIds: group.line_item_ids,
        createdAt: group.created_at,
        updatedAt: group.updated_at,
      })
    );
  }

  private mapOrderRow(
    row: OrderReadPortRow | null,
    orderIdForError?: string
  ): OrderReadPortRow | null {
    if (!row) {
      return null;
    }

    const numericOrderNumber = Number(row.order_number);
    if (!Number.isFinite(numericOrderNumber)) {
      const identifier = orderIdForError ?? row.id;
      throw new Error(
        `Invalid order number in read model for order ${identifier}`
      );
    }

    return {
      ...row,
      order_number: numericOrderNumber,
    };
  }
}
