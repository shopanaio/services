import {
  OrderLineItemReadView,
  OrderLineItemsReadRepository,
} from "@src/application/read/orderLineItemsReadRepository";
import { Money } from "@shopana/shared-money";
import { OrderState } from "@src/domain/order/evolve";
import { OrderReadModelAdapter } from "./orderReadModelAdapter";

export type OrderDeliveryAddressRow = {
  id: string;
  delivery_group_id: string;
  address1: string;
  address2: string | null;
  city: string;
  country_code: string;
  province_code: string | null;
  postal_code: string | null;
  first_name: string | null;
  last_name: string | null;
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
  selected_delivery_method: string | null;
  line_item_ids: string[];
  created_at: Date;
  updated_at: Date;
};

export type OrderDeliveryMethodRow = {
  code: string;
  project_id: string;
  delivery_group_id: string;
  delivery_method_type: string;
  payment_model: string;
};

export type OrderReadPortRow = {
  id: string;
  project_id: string;
  api_key_id: string | null;
  admin_id: string | null;
  sales_channel: string | null;
  external_source: string | null;
  external_id: string | null;
  customer_id: string | null;
  customer_email: string | null;
  customer_phone_e164: string | null;
  customer_country_code: string | null;
  customer_note: string | null;
  locale_code: string | null;
  currency_code: string;
  display_currency_code: string | null;
  display_exchange_rate: bigint | null;
  subtotal: bigint;
  shipping_total: bigint;
  discount_total: bigint;
  tax_total: bigint;
  grand_total: bigint;
  status: string;
  expires_at: Date | null;
  projected_version: bigint;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export interface OrderReadPort {
  findById(id: string): Promise<OrderReadPortRow | null>;
  findDeliveryAddresses(
    orderId: string
  ): Promise<OrderDeliveryAddressRow[]>;
  findAppliedPromoCodes(orderId: string): Promise<OrderPromoCode[]>;
  findDeliveryGroups(orderId: string): Promise<OrderDeliveryGroup[]>;
  findDeliveryMethods(orderId: string): Promise<OrderDeliveryMethodRow[]>;
}

export type OrderDeliveryAddress = {
  id: string;
  deliveryGroupId: string;
  address1: string;
  address2: string | null;
  city: string;
  countryCode: string;
  provinceCode: string | null;
  postalCode: string | null;
  firstName: string | null;
  lastName: string | null;
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

export type OrderDeliveryGroup = {
  id: string;
  projectId: string;
  orderId: string;
  selectedDeliveryMethod: string | null;
  lineItemIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type OrderDeliveryMethod = {
  code: string;
  projectId: string;
  deliveryGroupId: string;
  deliveryMethodType: string;
  paymentModel: string;
};

export type OrderReadView = {
  id: string;
  projectId: string;
  apiKeyId: string | null;
  adminId: string | null;
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
  displayCurrencyCode: string | null;
  displayExchangeRate: number | null;
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
  deliveryAddresses: OrderDeliveryAddress[];
  deliveryMethods: OrderDeliveryMethod[];
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
    const [row, appliedPromoCodes, deliveryGroups, deliveryAddresses, deliveryMethods, lineItems] =
      await Promise.all([
        this.port.findById(id),
        this.port.findAppliedPromoCodes(id),
        this.port.findDeliveryGroups(id),
        this.port.findDeliveryAddresses(id),
        this.port.findDeliveryMethods(id),
        this.lineItemsReadRepository.findByOrderId(id),
      ]);

    if (!row) return null;

    const totalQuantity = lineItems.reduce(
      (total, item) => total + item.quantity,
      0
    );

    const mappedDeliveryAddresses: OrderDeliveryAddress[] = deliveryAddresses.map(
      (address): OrderDeliveryAddress => ({
        id: address.id,
        deliveryGroupId: address.delivery_group_id,
        address1: address.address1,
        address2: address.address2,
        city: address.city,
        countryCode: address.country_code,
        provinceCode: address.province_code,
        postalCode: address.postal_code,
        firstName: address.first_name,
        lastName: address.last_name,
        email: address.email,
        phone: address.phone,
        metadata: address.metadata,
        createdAt: address.created_at,
        updatedAt: address.updated_at,
      })
    );

    const mappedDeliveryMethods: OrderDeliveryMethod[] = deliveryMethods.map(
      (method): OrderDeliveryMethod => ({
        code: method.code,
        projectId: method.project_id,
        deliveryGroupId: method.delivery_group_id,
        deliveryMethodType: method.delivery_method_type,
        paymentModel: method.payment_model,
      })
    );

    // Normalize Money currency in lines to cart currency
    const normalizedLineItems = lineItems.map((item) => ({
      ...item,
      unit: {
        ...item.unit,
        price: Money.fromMinor(item.unit.price.amountMinor(), row.currency_code),
        compareAtPrice: item.unit.compareAtPrice
          ? Money.fromMinor(item.unit.compareAtPrice.amountMinor(), row.currency_code)
          : null,
      },
      subtotalAmount: Money.fromMinor(item.subtotalAmount.amountMinor(), row.currency_code),
      discountAmount: Money.fromMinor(item.discountAmount.amountMinor(), row.currency_code),
      taxAmount: Money.fromMinor(item.taxAmount.amountMinor(), row.currency_code),
      totalAmount: Money.fromMinor(item.totalAmount.amountMinor(), row.currency_code),
    }));

    return {
      id: row.id,
      projectId: row.project_id,
      apiKeyId: row.api_key_id,
      adminId: row.admin_id,
      salesChannel: row.sales_channel,
      externalSource: row.external_source,
      externalId: row.external_id,
      customerId: row.customer_id,
      customerEmail: row.customer_email,
      customerPhoneE164: row.customer_phone_e164,
      customerCountryCode: row.customer_country_code,
      customerNote: row.customer_note,
      localeCode: row.locale_code,
      currencyCode: row.currency_code,
      displayCurrencyCode: row.display_currency_code,
      displayExchangeRate: row.display_exchange_rate ? Number(row.display_exchange_rate) : null,
      subtotal: Money.fromMinor(row.subtotal, row.currency_code),
      shippingTotal: Money.fromMinor(row.shipping_total, row.currency_code),
      discountTotal: Money.fromMinor(row.discount_total, row.currency_code),
      taxTotal: Money.fromMinor(row.tax_total, row.currency_code),
      grandTotal: Money.fromMinor(row.grand_total, row.currency_code),
      status: row.status,
      expiresAt: row.expires_at,
      projectedVersion: row.projected_version,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      appliedPromoCodes: appliedPromoCodes,
      deliveryGroups,
      deliveryAddresses: mappedDeliveryAddresses,
      deliveryMethods: mappedDeliveryMethods,
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
