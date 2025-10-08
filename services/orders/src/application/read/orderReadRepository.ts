import {
  OrderLineItemReadView,
  OrderLineItemsReadRepository,
} from "@src/application/read/orderLineItemsReadRepository";
import { Money } from "@shopana/shared-money";
import { OrderState } from "@src/domain/order/evolve";
import { OrderReadModelAdapter } from "./orderReadModelAdapter";

export type OrderDeliveryAddressRow = {
  id: string;
  address1: string;
  address2: string | null;
  city: string;
  country_code: string;
  province_code: string | null;
  postal_code: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
};

export type OrderRecipientRow = {
  id: string;
  project_id: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  email: string | null;
  phone: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
};

export type OrderPromoCodeRow = {
  order_id: string;
  project_id: string;
  code: string;
  discount_type: string;
  value: string; // bigint as string
  provider: string;
  conditions: Record<string, unknown> | null;
  applied_at: Date;
};

export type OrderDeliveryGroupRow = {
  id: string;
  project_id: string;
  order_id: string;
  address_id: string | null;
  recipient_id: string | null;
  selected_delivery_method_code: string | null;
  selected_delivery_method_provider: string | null;
  line_item_ids: string[];
  created_at: Date;
  updated_at: Date;
};

export type OrderReadPortRow = {
  id: string;
  project_id: string;
  api_key_id: string | null;
  user_id: string | null;
  sales_channel: string | null;
  external_source: string | null;
  order_number: number;
  external_id: string | null;
  customer_id: string | null;
  customer_email: string | null;
  customer_phone_e164: string | null;
  customer_country_code: string | null;
  customer_note: string | null;
  locale_code: string | null;
  currency_code: string;
  subtotal: bigint;
  shipping_total: bigint;
  discount_total: bigint;
  tax_total: bigint;
  grand_total: bigint;
  status: string;
  expires_at: Date | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  projected_version: bigint;
};

export interface OrderReadPort {
  findById(id: string): Promise<OrderReadPortRow | null>;
  findDeliveryGroups(orderId: string): Promise<OrderDeliveryGroup[]>;
  findDeliveryAddresses(addressIds: string[]): Promise<OrderDeliveryAddressRow[]>;
  findRecipients(recipientIds: string[]): Promise<OrderRecipientRow[]>;
  findDeliveryMethods(deliveryGroupIds: string[]): Promise<OrderDeliveryMethodRow[]>;
  findPaymentMethods(orderId: string): Promise<OrderPaymentMethodRow[]>;
  findSelectedPaymentMethod(orderId: string): Promise<OrderSelectedPaymentMethodRow | null>;
  findAppliedPromoCodes(orderId: string): Promise<OrderPromoCode[]>;
}

export type OrderDeliveryAddress = {
  id: string;
  address1: string;
  address2: string | null;
  city: string;
  countryCode: string;
  provinceCode: string | null;
  postalCode: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderRecipient = {
  id: string;
  projectId: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  email: string | null;
  phone: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderPromoCode = {
  orderId: string;
  projectId: string;
  code: string;
  discountType: string;
  value: number; // converted from bigint string
  provider: string;
  conditions: Record<string, unknown> | null;
  appliedAt: Date;
};

export type OrderDeliveryMethodRow = {
  code: string;
  provider: string;
  project_id: string;
  delivery_group_id: string;
  delivery_method_type: string;
  payment_model: string | null;
  metadata: Record<string, unknown> | null;
  customer_input: Record<string, unknown> | null;
};

export type OrderPaymentMethodRow = {
  order_id: string;
  project_id: string;
  code: string;
  provider: string;
  flow: string;
  metadata: Record<string, unknown> | null;
  customer_input: Record<string, unknown> | null;
};

export type OrderSelectedPaymentMethodRow = {
  order_id: string;
  project_id: string;
  code: string;
  provider: string;
};

export type OrderDeliveryGroup = {
  id: string;
  projectId: string;
  orderId: string;
  addressId: string | null;
  recipientId: string | null;
  selectedDeliveryMethodCode: string | null;
  selectedDeliveryMethodProvider: string | null;
  lineItemIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type OrderDeliveryMethod = {
  code: string;
  provider: string;
  projectId: string;
  deliveryGroupId: string;
  deliveryMethodType: string;
  paymentModel: string | null;
  metadata: Record<string, unknown> | null;
  customerInput: Record<string, unknown> | null;
};

export type OrderPaymentMethod = {
  orderId: string;
  projectId: string;
  code: string;
  provider: string;
  flow: string;
  metadata: Record<string, unknown> | null;
  customerInput: Record<string, unknown> | null;
};

export type OrderSelectedPaymentMethod = {
  orderId: string;
  projectId: string;
  code: string;
  provider: string;
};

export type OrderReadView = {
  id: string;
  projectId: string;
  apiKeyId: string | null;
  adminId: string | null;
  number: number;
  salesChannel: string | null;
  externalSource: string | null;
  externalId: string | null;
  customerId: string | null;
  customerEmail: string | null;
  customerPhoneE164: string | null;
  customerCountryCode: string | null;
  customerNote: string | null;
  localeCode: string | null;
  currencyCode: string;
  subtotal: Money;
  shippingTotal: Money;
  discountTotal: Money;
  taxTotal: Money;
  grandTotal: Money;
  status: string;
  expiresAt: Date | null;
  projectedVersion: bigint;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  appliedPromoCodes: OrderPromoCode[];
  deliveryGroups: OrderDeliveryGroup[];
  deliveryAddresses: Map<string, OrderDeliveryAddress>; // key: addressId
  recipients: Map<string, OrderRecipient>; // key: recipientId
  deliveryMethods: Map<string, OrderDeliveryMethod[]>; // key: deliveryGroupId
  paymentMethods: OrderPaymentMethod[];
  selectedPaymentMethod: OrderSelectedPaymentMethod | null;
  // Aggregated data
  lineItems: OrderLineItemReadView[];
  totalQuantity: number;
};

export class OrderReadRepository {
  private readonly port: OrderReadPort;
  private readonly lineItemsReadRepository: OrderLineItemsReadRepository;

  constructor(
    port: OrderReadPort,
    lineItemsReadRepository: OrderLineItemsReadRepository
  ) {
    this.port = port;
    this.lineItemsReadRepository = lineItemsReadRepository;
  }

  async findById(id: string): Promise<OrderReadView | null> {
    const [
      row,
      appliedPromoCodes,
      deliveryGroups,
      lineItems,
      paymentMethods,
      selectedPaymentMethod,
    ] = await Promise.all([
      this.port.findById(id),
      this.port.findAppliedPromoCodes(id),
      this.port.findDeliveryGroups(id),
      this.lineItemsReadRepository.findByOrderId(id),
      this.port.findPaymentMethods(id),
      this.port.findSelectedPaymentMethod(id),
    ]);

    if (!row) return null;

    // Collect unique address and recipient IDs
    const addressIds = deliveryGroups
      .map(g => g.addressId)
      .filter((id): id is string => id !== null);
    const recipientIds = deliveryGroups
      .map(g => g.recipientId)
      .filter((id): id is string => id !== null);
    const deliveryGroupIds = deliveryGroups.map(g => g.id);

    // Fetch addresses, recipients and delivery methods
    const [addressRows, recipientRows, deliveryMethodRows] = await Promise.all([
      addressIds.length > 0 ? this.port.findDeliveryAddresses(addressIds) : Promise.resolve([]),
      recipientIds.length > 0 ? this.port.findRecipients(recipientIds) : Promise.resolve([]),
      deliveryGroupIds.length > 0 ? this.port.findDeliveryMethods(deliveryGroupIds) : Promise.resolve([]),
    ]);

    // Build maps
    const deliveryAddresses = new Map<string, OrderDeliveryAddress>(
      addressRows.map(addr => [
        addr.id,
        {
          id: addr.id,
          address1: addr.address1,
          address2: addr.address2,
          city: addr.city,
          countryCode: addr.country_code,
          provinceCode: addr.province_code,
          postalCode: addr.postal_code,
          metadata: addr.metadata,
          createdAt: addr.created_at,
          updatedAt: addr.updated_at,
        }
      ])
    );

    const recipients = new Map<string, OrderRecipient>(
      recipientRows.map(rec => [
        rec.id,
        {
          id: rec.id,
          projectId: rec.project_id,
          firstName: rec.first_name,
          lastName: rec.last_name,
          middleName: rec.middle_name,
          email: rec.email,
          phone: rec.phone,
          metadata: rec.metadata,
          createdAt: rec.created_at,
          updatedAt: rec.updated_at,
        }
      ])
    );

    // Build delivery methods map grouped by delivery group
    const deliveryMethods = new Map<string, OrderDeliveryMethod[]>();
    for (const method of deliveryMethodRows) {
      const groupMethods = deliveryMethods.get(method.delivery_group_id) || [];
      groupMethods.push({
        code: method.code,
        provider: method.provider,
        projectId: method.project_id,
        deliveryGroupId: method.delivery_group_id,
        deliveryMethodType: method.delivery_method_type,
        paymentModel: method.payment_model,
        metadata: method.metadata,
        customerInput: method.customer_input,
      });
      deliveryMethods.set(method.delivery_group_id, groupMethods);
    }

    // Map payment methods
    const mappedPaymentMethods: OrderPaymentMethod[] = paymentMethods.map(pm => ({
      orderId: pm.order_id,
      projectId: pm.project_id,
      code: pm.code,
      provider: pm.provider,
      flow: pm.flow,
      metadata: pm.metadata,
      customerInput: pm.customer_input,
    }));

    // Map selected payment method
    const mappedSelectedPaymentMethod: OrderSelectedPaymentMethod | null = selectedPaymentMethod
      ? {
          orderId: selectedPaymentMethod.order_id,
          projectId: selectedPaymentMethod.project_id,
          code: selectedPaymentMethod.code,
          provider: selectedPaymentMethod.provider,
        }
      : null;

    const totalQuantity = lineItems.reduce(
      (total, item) => total + item.quantity,
      0
    );

    // Normalize Money currency in lines to cart currency
    const normalizedLineItems = lineItems.map((item) => ({
      ...item,
      unit: {
        ...item.unit,
        price: Money.fromMinor(
          item.unit.price.amountMinor(),
          row.currency_code
        ),
        compareAtPrice: item.unit.compareAtPrice
          ? Money.fromMinor(
              item.unit.compareAtPrice.amountMinor(),
              row.currency_code
            )
          : null,
      },
      subtotalAmount: Money.fromMinor(
        item.subtotalAmount.amountMinor(),
        row.currency_code
      ),
      discountAmount: Money.fromMinor(
        item.discountAmount.amountMinor(),
        row.currency_code
      ),
      taxAmount: Money.fromMinor(
        item.taxAmount.amountMinor(),
        row.currency_code
      ),
      totalAmount: Money.fromMinor(
        item.totalAmount.amountMinor(),
        row.currency_code
      ),
    }));

    return {
      id: row.id,
      projectId: row.project_id,
      apiKeyId: row.api_key_id,
      adminId: row.user_id,
      salesChannel: row.sales_channel,
      externalSource: row.external_source,
      number: row.order_number,
      externalId: row.external_id,
      customerId: row.customer_id,
      customerEmail: row.customer_email,
      customerPhoneE164: row.customer_phone_e164,
      customerCountryCode: row.customer_country_code,
      customerNote: row.customer_note,
      localeCode: row.locale_code,
      currencyCode: row.currency_code,
      subtotal: Money.fromMinor(row.subtotal, row.currency_code),
      shippingTotal: Money.fromMinor(row.shipping_total, row.currency_code),
      discountTotal: Money.fromMinor(row.discount_total, row.currency_code),
      taxTotal: Money.fromMinor(row.tax_total, row.currency_code),
      grandTotal: Money.fromMinor(row.grand_total, row.currency_code),
      status: row.status,
      expiresAt: row.expires_at,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      projectedVersion: row.projected_version,
      appliedPromoCodes: appliedPromoCodes,
      deliveryGroups,
      deliveryAddresses,
      recipients,
      deliveryMethods,
      paymentMethods: mappedPaymentMethods,
      selectedPaymentMethod: mappedSelectedPaymentMethod,
      lineItems: normalizedLineItems,
      totalQuantity,
    };
  }

  /**
   * Returns order data in OrderState domain model format
   * Uses the same data source as findById, but returns OrderState
   */
  async findByIdAsOrderState(id: string): Promise<OrderState | null> {
    const readView = await this.findById(id);
    if (!readView) return null;

    return OrderReadModelAdapter.toOrderState(readView);
  }
}
