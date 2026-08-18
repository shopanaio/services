import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type {
  OrderReadPort,
  OrderReadPortRow,
  OrderDeliveryAddressRow,
  OrderRecipientRow,
  OrderDeliveryMethodRow,
  OrderPaymentMethodRow,
  OrderSelectedPaymentMethodRow,
  OrderPromoCode,
  OrderDeliveryGroup,
} from "@src/application/read/orderReadRepository";
import {
  orderAppliedDiscounts,
  orderDeliveryAddresses,
  orderDeliveryGroups,
  orderDeliveryMethods,
  orderPaymentMethods,
  orderRecipients,
  orders,
  ordersPiiRecords,
} from "@src/repositories/models/index";
import { coerceToDate } from "@src/utils/date";
import { BaseRepository } from "@src/repositories/BaseRepository";

export class OrderReadRepository extends BaseRepository implements OrderReadPort {
  async findById(id: string): Promise<OrderReadPortRow | null> {
    const [row] = await this.connection
      .select({
        order: orders,
        customerId: ordersPiiRecords.customerId,
        customerEmail: ordersPiiRecords.customerEmail,
        customerPhoneE164: ordersPiiRecords.customerPhoneE164,
        customerCountryCode: ordersPiiRecords.countryCode,
        customerFirstName: ordersPiiRecords.firstName,
        customerLastName: ordersPiiRecords.lastName,
        customerMiddleName: ordersPiiRecords.middleName,
        customerNote: ordersPiiRecords.customerNote,
      })
      .from(orders)
      .leftJoin(ordersPiiRecords, eq(ordersPiiRecords.orderId, orders.id))
      .where(eq(orders.id, id))
      .limit(1);

    if (!row) return null;
    const [lifecycle] = await this.connection.execute<{
      paymentStatus: string;
      fulfillmentStatus: string;
      deliveryStatus: string;
      authorizedAmount: string;
      capturedAmount: string;
      refundedAmount: string;
      outstandingAmount: string;
    }>(sql`
      SELECT
        current_order."payment_status"::text AS "paymentStatus",
        current_order."fulfillment_status"::text AS "fulfillmentStatus",
        current_order."delivery_status"::text AS "deliveryStatus",
        COALESCE(latest_collection.payload->'authorizedAmount'->>'amountMinor', '0') AS "authorizedAmount",
        COALESCE(latest_collection.payload->'capturedAmount'->>'amountMinor', '0') AS "capturedAmount",
        COALESCE(latest_collection.payload->'refundedAmount'->>'amountMinor', '0') AS "refundedAmount",
        COALESCE(latest_collection.payload->'outstandingAmount'->>'amountMinor', current_order."total_amount"::text) AS "outstandingAmount"
      FROM "orders"."orders" AS current_order
      LEFT JOIN LATERAL (
        SELECT inbox.payload
        FROM "orders"."order_payment_event_inbox" AS inbox
        WHERE inbox."store_id" = current_order."store_id"
          AND inbox."order_id" = current_order."id"
          AND inbox."event_type" = 'payment.collection.state_changed'
        ORDER BY inbox."event_sequence" DESC
        LIMIT 1
      ) AS latest_collection ON TRUE
      WHERE current_order."id" = ${id}::uuid
      LIMIT 1
    `);
    if (!lifecycle) throw new Error(`Order lifecycle projection is missing for order ${id}`);
    const order = row.order;
    const orderNumber = Number(order.orderNumber);
    if (!Number.isSafeInteger(orderNumber)) {
      throw new Error(`Invalid order number in read model for order ${id}`);
    }

    return {
      id: order.id,
      store_id: order.storeId,
      api_key_id: order.apiKeyId,
      user_id: order.userId,
      sales_channel: order.salesChannel,
      external_source: order.externalSource,
      order_number: orderNumber,
      external_id: order.externalId,
      customer_id: row.customerId,
      customer_email: row.customerEmail,
      customer_phone_e164: row.customerPhoneE164,
      customer_country_code: row.customerCountryCode,
      customer_first_name: row.customerFirstName,
      customer_last_name: row.customerLastName,
      customer_middle_name: row.customerMiddleName,
      customer_note: row.customerNote,
      locale_code: order.localeCode,
      currency_code: order.currencyCode,
      subtotal: order.subtotal,
      shipping_total: order.shippingTotal,
      discount_total: order.discountTotal,
      tax_total: order.taxTotal,
      grand_total: order.grandTotal,
      status: order.status,
      payment_status: lifecycle.paymentStatus,
      fulfillment_status: lifecycle.fulfillmentStatus,
      delivery_status: lifecycle.deliveryStatus,
      payment_authorized: BigInt(lifecycle.authorizedAmount),
      payment_captured: BigInt(lifecycle.capturedAmount),
      payment_refunded: BigInt(lifecycle.refundedAmount),
      payment_outstanding: BigInt(lifecycle.outstandingAmount),
      placed_at: order.placedAt == null ? null : coerceToDate(order.placedAt),
      closed_at: order.closedAt == null ? null : coerceToDate(order.closedAt),
      expires_at: order.expiresAt == null ? null : coerceToDate(order.expiresAt),
      metadata: order.metadata,
      created_at: coerceToDate(order.createdAt),
      updated_at: coerceToDate(order.updatedAt),
      deleted_at: order.deletedAt == null ? null : coerceToDate(order.deletedAt),
    };
  }

  async findDeliveryAddresses(addressIds: string[]): Promise<OrderDeliveryAddressRow[]> {
    if (addressIds.length === 0) return [];
    const rows = await this.connection
      .select()
      .from(orderDeliveryAddresses)
      .where(inArray(orderDeliveryAddresses.id, addressIds));
    return rows.map((row) => ({
      id: row.id,
      address1: row.address1 ?? "",
      address2: row.address2,
      city: row.city ?? "",
      country_code: row.countryCode ?? "",
      province_code: row.provinceCode,
      postal_code: row.postalCode,
      metadata: row.metadata,
      created_at: coerceToDate(row.createdAt),
      updated_at: coerceToDate(row.updatedAt),
    }));
  }

  async findRecipients(recipientIds: string[]): Promise<OrderRecipientRow[]> {
    if (recipientIds.length === 0) return [];
    const rows = await this.connection
      .select()
      .from(orderRecipients)
      .where(inArray(orderRecipients.id, recipientIds));
    return rows.map((row) => ({
      id: row.id,
      store_id: row.storeId,
      first_name: row.firstName,
      last_name: row.lastName,
      middle_name: row.middleName,
      email: row.email,
      phone: row.phone,
      metadata: row.metadata,
      created_at: coerceToDate(row.createdAt),
      updated_at: coerceToDate(row.updatedAt),
    }));
  }

  async findAppliedPromoCodes(orderId: string): Promise<OrderPromoCode[]> {
    const rows = await this.connection
      .select()
      .from(orderAppliedDiscounts)
      .where(eq(orderAppliedDiscounts.orderId, orderId))
      .orderBy(asc(orderAppliedDiscounts.appliedAt));
    return rows.map((row) => ({
      orderId: row.orderId,
      storeId: row.storeId,
      code: row.code ?? "",
      discountType: row.discountType ?? "",
      value: row.value.toString(),
      provider: row.provider ?? "",
      conditions: row.conditions,
      appliedAt: coerceToDate(row.appliedAt),
    }));
  }

  async findDeliveryGroups(orderId: string): Promise<OrderDeliveryGroup[]> {
    const rows = await this.connection
      .select()
      .from(orderDeliveryGroups)
      .where(eq(orderDeliveryGroups.orderId, orderId))
      .orderBy(asc(orderDeliveryGroups.createdAt));
    return rows.map((row) => ({
      id: row.id,
      storeId: row.storeId,
      orderId: row.orderId,
      addressId: row.addressId,
      recipientId: row.recipientId,
      selectedDeliveryMethodCode: row.selectedDeliveryMethodCode,
      selectedDeliveryMethodProvider: row.selectedDeliveryMethodProvider,
      lineItemIds: row.lineItemIds,
      createdAt: coerceToDate(row.createdAt),
      updatedAt: coerceToDate(row.updatedAt),
    }));
  }

  async findDeliveryMethods(deliveryGroupIds: string[]): Promise<OrderDeliveryMethodRow[]> {
    if (deliveryGroupIds.length === 0) return [];
    const rows = await this.connection
      .select()
      .from(orderDeliveryMethods)
      .where(inArray(orderDeliveryMethods.deliveryGroupId, deliveryGroupIds));
    return rows.map((row) => ({
      code: row.code,
      provider: row.provider,
      store_id: row.storeId,
      delivery_group_id: row.deliveryGroupId,
      delivery_method_type: row.deliveryMethodType ?? "",
      payment_model: row.paymentModel,
      metadata: row.metadata,
      customer_input: row.customerInput,
    }));
  }

  async findPaymentMethods(orderId: string): Promise<OrderPaymentMethodRow[]> {
    const rows = await this.connection
      .select()
      .from(orderPaymentMethods)
      .where(eq(orderPaymentMethods.orderId, orderId));
    return rows.map((row) => ({
      order_id: row.orderId,
      store_id: row.storeId,
      code: row.code,
      provider: row.provider,
      flow: row.flow,
      metadata: {
        ...row.providerData,
        ...(row.title ? { title: row.title } : {}),
      },
      customer_input: row.customerInputSnapshot,
    }));
  }

  async findSelectedPaymentMethod(orderId: string): Promise<OrderSelectedPaymentMethodRow | null> {
    const [row] = await this.connection
      .select()
      .from(orderPaymentMethods)
      .where(and(
        eq(orderPaymentMethods.orderId, orderId),
        eq(orderPaymentMethods.isSelected, true),
      ))
      .limit(1);
    return row ? {
      order_id: row.orderId,
      store_id: row.storeId,
      code: row.code,
      provider: row.provider,
    } : null;
  }
}
