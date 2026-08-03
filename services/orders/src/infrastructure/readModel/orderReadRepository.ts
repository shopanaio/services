import { asc, eq, inArray } from "drizzle-orm";
import type { TransactionManager } from "@shopana/shared-kernel";
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
import type { Database } from "@src/infrastructure/db/database";
import {
  orderAppliedDiscounts,
  orderDeliveryAddresses,
  orderDeliveryGroups,
  orderDeliveryMethods,
  orderPaymentMethods,
  orderRecipients,
  orders,
  ordersPiiRecords,
  orderSelectedPaymentMethods,
} from "@src/repositories/models/index";
import { coerceToDate } from "@src/utils/date";

export class OrderReadRepository implements OrderReadPort {
  constructor(
    private readonly db: Database,
    private readonly txManager: TransactionManager<Database>,
  ) {}

  private get connection(): Database {
    return this.txManager.getConnection() as Database;
  }

  async findById(id: string): Promise<OrderReadPortRow | null> {
    const [row] = await this.connection
      .select({
        order: orders,
        customerId: ordersPiiRecords.customerId,
        customerEmail: ordersPiiRecords.customerEmail,
        customerPhoneE164: ordersPiiRecords.customerPhoneE164,
        customerCountryCode: ordersPiiRecords.countryCode,
        customerNote: ordersPiiRecords.customerNote,
      })
      .from(orders)
      .leftJoin(ordersPiiRecords, eq(ordersPiiRecords.orderId, orders.id))
      .where(eq(orders.id, id))
      .limit(1);

    if (!row) return null;
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
      customer_note: row.customerNote,
      locale_code: order.localeCode,
      currency_code: order.currencyCode,
      subtotal: order.subtotal,
      shipping_total: order.shippingTotal,
      discount_total: order.discountTotal,
      tax_total: order.taxTotal,
      grand_total: order.grandTotal,
      status: order.status,
      expires_at: order.expiresAt == null ? null : coerceToDate(order.expiresAt),
      metadata: order.metadata,
      created_at: coerceToDate(order.createdAt),
      updated_at: coerceToDate(order.updatedAt),
      deleted_at: order.deletedAt == null ? null : coerceToDate(order.deletedAt),
      projected_version: order.projectedVersion,
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
      value: Number(row.value),
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
      metadata: row.metadata,
      customer_input: row.customerInput,
    }));
  }

  async findSelectedPaymentMethod(orderId: string): Promise<OrderSelectedPaymentMethodRow | null> {
    const [row] = await this.connection
      .select()
      .from(orderSelectedPaymentMethods)
      .where(eq(orderSelectedPaymentMethods.orderId, orderId))
      .limit(1);
    return row ? {
      order_id: row.orderId,
      store_id: row.storeId,
      code: row.code,
      provider: row.provider,
    } : null;
  }
}
