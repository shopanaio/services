import {
  CheckoutLineItemReadView,
  CheckoutLineItemsReadRepository,
} from "@src/application/read/checkoutLineItemsReadRepository";
import { Money } from "@shopana/shared-money";
import { CheckoutState } from "@src/domain/checkout/types";
import { CheckoutReadModelAdapter } from "./checkoutReadModelAdapter";
import type { PaymentFlow } from "@shopana/plugin-sdk/payment";

export type CheckoutDeliveryAddressRow = {
  id: string;
  delivery_group_id: string;
  address1: string;
  address2: string | null;
  city: string;
  country_code: string;
  province_code: string | null;
  postal_code: string | null;
  first_name: string | null; // from checkout_recipients
  last_name: string | null;  // from checkout_recipients
  middle_name: string | null; // from checkout_recipients
  email: string | null;      // from checkout_recipients
  phone: string | null;      // from checkout_recipients
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
};

export type CheckoutPromoCodeRow = {
  checkout_id: string;
  project_id: string;
  code: string;
  discount_type: string;
  value: string; // bigint as string
  provider: string;
  conditions: Record<string, unknown> | null;
  applied_at: Date;
};

export type CheckoutDeliveryGroupRow = {
  id: string;
  project_id: string;
  checkout_id: string;
  selected_delivery_method_code: string | null;
  selected_delivery_method_provider: string | null;
  line_item_ids: string[];
  created_at: Date;
  updated_at: Date;
};

export type CheckoutDeliveryMethodRow = {
  code: string;
  provider: string;
  project_id: string;
  delivery_group_id: string;
  delivery_method_type: string;
  payment_model: string;
  customer_input: Record<string, unknown> | null;
};

export type CheckoutPaymentMethod = {
  code: string;
  provider: string;
  flow: PaymentFlow;
  metadata: Record<string, unknown> | null;
  customerInput: Record<string, unknown> | null;
};

export type CheckoutReadPortRow = {
  id: string;
  project_id: string;
  api_key_id: string | null;
  admin_id: string | null;
  sales_channel: string | null;
  external_source: string | null;
  external_id: string | null;
  customer_id: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_middle_name: string | null;
  customer_email: string | null;
  customer_phone_e164: string | null;
  customer_country_code: string | null; // kept for compatibility; now null
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
};

export interface CheckoutReadPort {
  findById(id: string): Promise<CheckoutReadPortRow | null>;
  findDeliveryAddresses(
    checkoutId: string
  ): Promise<CheckoutDeliveryAddressRow[]>;
  findAppliedPromoCodes(checkoutId: string): Promise<CheckoutPromoCode[]>;
  findDeliveryGroups(checkoutId: string): Promise<CheckoutDeliveryGroup[]>;
  findDeliveryMethods(checkoutId: string): Promise<CheckoutDeliveryMethodRow[]>;
  findPaymentMethods(checkoutId: string): Promise<CheckoutPaymentMethod[]>;
  findSelectedPaymentMethod(
    checkoutId: string
    // AI: this should be typed with the correct interface
  ): Promise<{ code: string; provider: string } | null>;
  findTags(checkoutId: string): Promise<CheckoutTagRow[]>;
}

export type CheckoutDeliveryAddress = {
  id: string;
  deliveryGroupId: string;
  address1: string;
  address2: string | null;
  city: string;
  countryCode: string;
  provinceCode: string | null;
  postalCode: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CheckoutPromoCode = {
  checkoutId: string;
  projectId: string;
  code: string;
  discountType: string;
  value: number; // converted from bigint string
  provider: string;
  conditions: Record<string, unknown> | null;
  appliedAt: Date;
};

export type CheckoutDeliveryGroup = {
  id: string;
  projectId: string;
  checkoutId: string;
  selectedDeliveryMethod: string | null;
  selectedDeliveryMethodProvider: string | null;
  lineItemIds: string[];
  recipient: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    middleName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CheckoutDeliveryMethod = {
  code: string;
  projectId: string;
  deliveryGroupId: string;
  deliveryMethodType: string;
  paymentModel: string;
  provider: string;
  customerInput: Record<string, unknown> | null;
};

export type CheckoutTagRow = {
  id: string;
  checkout_id: string;
  project_id: string;
  slug: string;
  is_unique: boolean;
  created_at: Date;
  updated_at: Date;
};

export type CheckoutTag = {
  id: string;
  checkoutId: string;
  projectId: string;
  slug: string;
  isUnique: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CheckoutReadView = {
  id: string;
  projectId: string;
  apiKeyId: string | null;
  adminId: string | null;
  salesChannel: string | null;
  externalSource: string | null;
  externalId: string | null;
  customerId: string | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerMiddleName: string | null;
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
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  appliedPromoCodes: CheckoutPromoCode[];
  deliveryGroups: CheckoutDeliveryGroup[];
  deliveryAddresses: CheckoutDeliveryAddress[];
  deliveryMethods: CheckoutDeliveryMethod[];
  // Payment aggregate (read from checkout_payment_methods)
  payment: {
    methods: CheckoutPaymentMethod[];
    selectedMethod: { code: string; provider: string } | null;
    payableAmount: Money; // currently equals grandTotal minus carrier direct if applicable (not available yet)
  } | null;
  tags: CheckoutTag[];
  // Aggregated data
  lineItems: CheckoutLineItemReadView[];
  totalQuantity: number;
};

export class CheckoutReadRepository {
  private readonly port: CheckoutReadPort;
  private readonly lineItemsReadRepository: CheckoutLineItemsReadRepository;

  constructor(
    port: CheckoutReadPort,
    lineItemsReadRepository: CheckoutLineItemsReadRepository
  ) {
    this.port = port;
    this.lineItemsReadRepository = lineItemsReadRepository;
  }

  async findById(id: string): Promise<CheckoutReadView | null> {
    const [
      row,
      appliedPromoCodes,
      deliveryGroups,
      deliveryAddresses,
      deliveryMethods,
      lineItems,
      paymentMethods,
      selectedPayment,
      tags,
    ] = await Promise.all([
      this.port.findById(id),
      this.port.findAppliedPromoCodes(id),
      this.port.findDeliveryGroups(id),
      this.port.findDeliveryAddresses(id),
      this.port.findDeliveryMethods(id),
      this.lineItemsReadRepository.findByCheckoutId(id),
      this.port.findPaymentMethods(id),
      this.port.findSelectedPaymentMethod(id),
      this.port.findTags(id),
    ]);

    if (!row) return null;

    const totalQuantity = lineItems.reduce(
      (total, item) => total + item.quantity,
      0
    );

    const mappedDeliveryAddresses: CheckoutDeliveryAddress[] =
      deliveryAddresses.map(
        (address): CheckoutDeliveryAddress => ({
          id: address.id,
          deliveryGroupId: address.delivery_group_id,
          address1: address.address1,
          address2: address.address2,
          city: address.city,
          countryCode: address.country_code,
          provinceCode: address.province_code,
          postalCode: address.postal_code,
          email: address.email,
          firstName: address.first_name,
          lastName: address.last_name,
          phone: address.phone,
          metadata: address.metadata,
          createdAt: address.created_at,
          updatedAt: address.updated_at,
        })
      );

    const mappedDeliveryMethods: CheckoutDeliveryMethod[] = deliveryMethods.map(
      (method): CheckoutDeliveryMethod => ({
        code: method.code,
        projectId: method.project_id,
        deliveryGroupId: method.delivery_group_id,
        deliveryMethodType: method.delivery_method_type,
        paymentModel: method.payment_model,
        provider: method.provider,
        customerInput: method.customer_input,
      })
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
      adminId: row.admin_id,
      salesChannel: row.sales_channel,
      externalSource: row.external_source,
      externalId: row.external_id,
      customerId: row.customer_id,
      customerFirstName: row.customer_first_name,
      customerLastName: row.customer_last_name,
      customerMiddleName: row.customer_middle_name,
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
      appliedPromoCodes: appliedPromoCodes,
      deliveryGroups: deliveryGroups,
      deliveryAddresses: mappedDeliveryAddresses,
      deliveryMethods: mappedDeliveryMethods,
      lineItems: normalizedLineItems,
      totalQuantity,
      payment: {
        methods: paymentMethods,
        selectedMethod: selectedPayment
          ? {
              code: selectedPayment.code,
              provider: selectedPayment.provider,
            }
          : null,
        payableAmount: Money.fromMinor(row.grand_total, row.currency_code),
      },
      tags: tags.map(
        (tag): CheckoutTag => ({
          id: tag.id,
          checkoutId: tag.checkout_id,
          projectId: tag.project_id,
          slug: tag.slug,
          isUnique: tag.is_unique,
          createdAt: tag.created_at,
          updatedAt: tag.updated_at,
        })
      ),
    };
  }

  /**
   * Returns checkout data in CheckoutState domain model format
   * Uses the same data source as findById, but returns CheckoutState
   */
  async findByIdAsCheckoutState(id: string): Promise<CheckoutState | null> {
    const readView = await this.findById(id);
    if (!readView) return null;

    return CheckoutReadModelAdapter.toCheckoutState(readView);
  }
}
