import { OrderEventTypes, type OrderEvent } from "./events";
import type { CheckoutSnapshot } from "./checkoutSnapshot";
import { Money } from "@shopana/shared-money";
import type { DeliveryMethodType, ShippingPaymentModel } from "@shopana/shipping-plugin-sdk";

/** Order status aligned with admin GraphQL schema. */
export enum OrderStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  CLOSED = "CLOSED",
  CANCELLED = "CANCELLED",
}

/**
 * Domain snapshot of a purchasable unit that composes an order line.
 */
export type OrderUnitSnapshot = Readonly<{
  id: string;
  price: Money;
  compareAtPrice: Money | null;
  title: string;
  imageUrl: string | null;
  sku: string | null;
  snapshot: Record<string, unknown> | null;
}>;

/**
 * Domain state for a single order line item.
 */
export type OrderLineItemState = Readonly<{
  lineId: string;
  quantity: number;
  unit: OrderUnitSnapshot;
}>;

/**
 * Delivery provider descriptor for a delivery method.
 */
export type OrderDeliveryProvider = Readonly<{
  code: string;
  data: Record<string, unknown>;
}>;

/**
 * Delivery method descriptor selected or available for a delivery group.
 */
export type OrderDeliveryMethod = Readonly<{
  code: string;
  deliveryMethodType: DeliveryMethodType;
  shippingPaymentModel: ShippingPaymentModel;
  provider: OrderDeliveryProvider;
}>;

/**
 * Delivery address attached to a delivery group.
 */
export type OrderDeliveryAddress = Readonly<{
  id: string;
  address1: string;
  address2?: string | null;
  city: string;
  countryCode: string;
  provinceCode?: string | null;
  postalCode?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  data?: Record<string, unknown> | null;
}>;

/**
 * Delivery group that groups lines by delivery address/method.
 */
export type OrderDeliveryGroup = Readonly<{
  id: string;
  orderLineIds: string[];
  deliveryAddress: OrderDeliveryAddress | null;
  selectedDeliveryMethod: OrderDeliveryMethod | null;
  deliveryMethods: OrderDeliveryMethod[];
  shippingCost: { amount: Money; paymentModel: ShippingPaymentModel } | null;
}>;

/**
 * Applied promo code snapshot attached to order.
 */
export type OrderPromoCode = Readonly<{
  code: string;
  appliedAt: Date;
  discountType: string;
  value: number | Money;
  provider: string;
  conditions?: Record<string, unknown> | null;
}>;

/**
 * Applied discount normalized representation used for pricing/totals context.
 */
export type AppliedDiscount = Readonly<{
  code: string;
  appliedAt: Date;
  type: string;
  value: number | Money;
  provider: string;
}>;

/**
 * Aggregate state for Order. Designed for event-sourced storage and rebuild.
 */
export type OrderState = Readonly<{
  // Identity and lifecycle
  id: string;
  exists: boolean;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  // Context and source
  apiKey: string;
  createdBy: string | null;
  salesChannel: string;
  externalSource: string | null;
  externalId: string | null;

  // Localization and currency
  currencyCode: string;
  localeCode: string | null;

  // Totals
  subtotal: Money;
  discountTotal: Money;
  taxTotal: Money;
  shippingTotal: Money;
  grandTotal: Money;
  totalQuantity: number;

  // Customer facing metadata
  number: number | null;
  status: OrderStatus;
  expiresAt: Date | null;
  version: number;
  metadata: Record<string, unknown>;

  // Customer identity
  customerEmail: string | null;
  customerId: string | null;
  customerPhone: string | null;
  customerCountryCode: string | null;
  customerNote: string | null;

  // Business data
  idempotencyKey: string;
  linesRecord: Record<string, OrderLineItemState>;
  deliveryGroups: OrderDeliveryGroup[];
  appliedPromoCodes: OrderPromoCode[];
  appliedDiscounts: AppliedDiscount[];
}>;

/**
 * Creates initial empty state for the Order aggregate.
 */
export const orderInitialState = (): OrderState => ({
  id: "",
  exists: false,
  projectId: "",
  createdAt: new Date(0),
  updatedAt: new Date(0),
  deletedAt: null,

  apiKey: "",
  createdBy: null,
  salesChannel: "",
  externalSource: null,
  externalId: null,

  currencyCode: "",
  localeCode: null,

  subtotal: Money.zero(),
  discountTotal: Money.zero(),
  taxTotal: Money.zero(),
  shippingTotal: Money.zero(),
  grandTotal: Money.zero(),
  totalQuantity: 0,

  number: null,
  status: OrderStatus.DRAFT,
  expiresAt: null,
  version: 0,
  metadata: {},

  customerEmail: null,
  customerId: null,
  customerPhone: null,
  customerCountryCode: null,
  customerNote: null,

  idempotencyKey: "",
  linesRecord: {},
  deliveryGroups: [],
  appliedPromoCodes: [],
  appliedDiscounts: [],
});

export const orderEvolve = (
  current: OrderState,
  event: OrderEvent
): OrderState => {
  switch (event.type) {
    case OrderEventTypes.OrderCreated: {
      const { data, metadata } = event;
      const snapshot: CheckoutSnapshot = data.checkoutSnapshot;

      // Build lines record
      const linesRecord = Object.fromEntries(
        snapshot.lines.map((l) => [
          l.lineId,
          {
            lineId: l.lineId,
            quantity: l.quantity,
            unit: {
              id: l.unit.id,
              price: l.unit.price,
              compareAtPrice: l.unit.compareAtPrice,
              title: l.unit.title,
              imageUrl: l.unit.imageUrl,
              sku: l.unit.sku,
              snapshot: l.unit.snapshot,
            },
          } as OrderLineItemState,
        ])
      );

      // Build delivery groups
      const deliveryGroups: OrderDeliveryGroup[] = snapshot.deliveryGroups.map(
        (g) => ({
          id: g.id,
          orderLineIds: g.checkoutLineIds,
          deliveryAddress: g.deliveryAddress
            ? {
                id: g.deliveryAddress.id,
                address1: g.deliveryAddress.address1,
                address2: g.deliveryAddress.address2 ?? null,
                city: g.deliveryAddress.city,
                countryCode: g.deliveryAddress.countryCode,
                provinceCode: g.deliveryAddress.provinceCode ?? null,
                postalCode: g.deliveryAddress.postalCode ?? null,
                email: g.deliveryAddress.email ?? null,
                firstName: g.deliveryAddress.firstName ?? null,
                lastName: g.deliveryAddress.lastName ?? null,
                phone: g.deliveryAddress.phone ?? null,
                data: g.deliveryAddress.data ?? null,
              }
            : null,
          selectedDeliveryMethod: g.selectedDeliveryMethod
            ? {
                code: g.selectedDeliveryMethod.code,
                deliveryMethodType: g.selectedDeliveryMethod.deliveryMethodType,
                shippingPaymentModel: g.selectedDeliveryMethod.shippingPaymentModel,
                provider: {
                  code: g.selectedDeliveryMethod.provider.code,
                  data: g.selectedDeliveryMethod.provider.data,
                },
              }
            : null,
          deliveryMethods: [],
          shippingCost: g.shippingCost
            ? {
                amount: g.shippingCost.amount,
                paymentModel: g.shippingCost.paymentModel,
              }
            : null,
        })
      );

      // Applied promo codes
      const appliedPromoCodes: OrderPromoCode[] = snapshot.appliedPromoCodes.map(
        (p) => ({
          code: p.code,
          appliedAt: p.appliedAt,
          discountType: p.discountType,
          value: p.value,
          provider: p.provider,
          conditions: null,
        })
      );

      return {
        ...current,
        id: metadata.aggregateId,
        exists: true,
        projectId: metadata.projectId,
        apiKey: metadata.apiKey,
        createdBy: metadata.userId ?? null,
        salesChannel: snapshot.salesChannel,
        externalSource: snapshot.externalSource,
        externalId: snapshot.externalId,
        currencyCode: data.currencyCode,
        localeCode: snapshot.localeCode,
        subtotal: snapshot.totals.subtotal,
        discountTotal: snapshot.totals.discountTotal,
        taxTotal: snapshot.totals.taxTotal,
        shippingTotal: snapshot.totals.shippingTotal,
        grandTotal: snapshot.totals.grandTotal,
        totalQuantity: snapshot.totals.totalQuantity,
        customerEmail: snapshot.customer.email,
        customerId: snapshot.customer.customerId,
        customerPhone: snapshot.customer.phone,
        customerCountryCode: snapshot.customer.countryCode,
        customerNote: snapshot.customer.note,
        idempotencyKey: data.idempotencyKey,
        linesRecord,
        deliveryGroups,
        appliedPromoCodes,
        // Defaults
        number: null,
        status: OrderStatus.ACTIVE,
        expiresAt: null,
        version: 0,
        metadata: {},
        deletedAt: null,
        createdAt: metadata.now,
        updatedAt: metadata.now,
        appliedDiscounts: [],
      };
    }

    default:
      return current;
  }
};
