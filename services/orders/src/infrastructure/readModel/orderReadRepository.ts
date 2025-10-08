import type { SQLExecutor } from "@event-driven-io/dumbo";
import { rawSql, singleOrNull } from "@event-driven-io/dumbo";
import { dumboPool } from "@src/infrastructure/db/dumbo";
import { knex } from "@src/infrastructure/db/knex";
import type {
  OrderReadPort,
  OrderReadPortRow,
  OrderDeliveryAddressRow,
  OrderRecipientRow,
  OrderDeliveryMethodRow,
  OrderPaymentMethodRow,
  OrderSelectedPaymentMethodRow,
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
      .from("orders as o")
      .leftJoin("orders_pii_records as pii", "pii.order_id", "o.id")
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
        "o.subtotal",
        "o.shipping_total",
        "o.discount_total",
        "o.tax_total",
        "o.grand_total",
        "o.status",
        "o.expires_at",
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

  async findDeliveryAddresses(
    addressIds: string[]
  ): Promise<OrderDeliveryAddressRow[]> {
    if (addressIds.length === 0) return [];

    const q = knex
      .withSchema("platform")
      .table("order_delivery_addresses")
      .select(
        "id",
        "address1",
        "address2",
        "city",
        "country_code",
        "province_code",
        "postal_code",
        "metadata",
        "created_at",
        "updated_at"
      )
      .whereIn("id", addressIds)
      .toString();

    const result = await this.execute.query<OrderDeliveryAddressRow>(rawSql(q));
    return result.rows;
  }

  async findRecipients(
    recipientIds: string[]
  ): Promise<OrderRecipientRow[]> {
    if (recipientIds.length === 0) return [];

    const q = knex
      .withSchema("platform")
      .table("order_recipients")
      .select(
        "id",
        "project_id",
        "first_name",
        "last_name",
        "middle_name",
        "email",
        "phone",
        "metadata",
        "created_at",
        "updated_at"
      )
      .whereIn("id", recipientIds)
      .toString();

    const result = await this.execute.query<OrderRecipientRow>(rawSql(q));
    return result.rows;
  }

  async findAppliedPromoCodes(orderId: string): Promise<OrderPromoCode[]> {
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

  async findDeliveryGroups(orderId: string): Promise<OrderDeliveryGroup[]> {
    const q = knex
      .withSchema("platform")
      .table("order_delivery_groups")
      .select(
        "id",
        "project_id",
        "order_id",
        "address_id",
        "recipient_id",
        "selected_delivery_method_code",
        "selected_delivery_method_provider",
        knex.raw("COALESCE(line_item_ids::text[], '{}') as line_item_ids"),
        "created_at",
        "updated_at"
      )
      .where({ order_id: orderId })
      .orderBy("created_at", "asc")
      .toString();

    const result = await this.execute.query<OrderDeliveryGroupRow>(rawSql(q));
    return result.rows.map(
      (group): OrderDeliveryGroup => ({
        id: group.id,
        projectId: group.project_id,
        orderId: group.order_id,
        addressId: group.address_id,
        recipientId: group.recipient_id,
        selectedDeliveryMethodCode: group.selected_delivery_method_code,
        selectedDeliveryMethodProvider: group.selected_delivery_method_provider,
        lineItemIds: group.line_item_ids,
        createdAt: group.created_at,
        updatedAt: group.updated_at,
      })
    );
  }

  async findDeliveryMethods(
    deliveryGroupIds: string[]
  ): Promise<OrderDeliveryMethodRow[]> {
    if (deliveryGroupIds.length === 0) return [];

    const q = knex
      .withSchema("platform")
      .table("order_delivery_methods")
      .select(
        "code",
        "provider",
        "project_id",
        "delivery_group_id",
        "delivery_method_type",
        "payment_model",
        "metadata",
        "customer_input"
      )
      .whereIn("delivery_group_id", deliveryGroupIds)
      .toString();

    const result = await this.execute.query<OrderDeliveryMethodRow>(rawSql(q));
    return result.rows;
  }

  async findPaymentMethods(orderId: string): Promise<OrderPaymentMethodRow[]> {
    const q = knex
      .withSchema("platform")
      .table("order_payment_methods")
      .select(
        "order_id",
        "project_id",
        "code",
        "provider",
        "flow",
        "metadata",
        "customer_input"
      )
      .where({ order_id: orderId })
      .toString();

    const result = await this.execute.query<OrderPaymentMethodRow>(rawSql(q));
    return result.rows;
  }

  async findSelectedPaymentMethod(
    orderId: string
  ): Promise<OrderSelectedPaymentMethodRow | null> {
    const q = knex
      .withSchema("platform")
      .table("order_selected_payment_methods")
      .select("order_id", "project_id", "code", "provider")
      .where({ order_id: orderId })
      .toString();

    const row = await singleOrNull(
      this.execute.query<OrderSelectedPaymentMethodRow>(rawSql(q))
    );

    return row;
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
