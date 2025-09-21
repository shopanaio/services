import {
  CheckoutEventTypes,
  type CheckoutEvent,
  type CheckoutLinesAdded,
  type CheckoutCustomerIdentityUpdated,
  type CheckoutCustomerNoteUpdated,
  type CheckoutLanguageCodeUpdated,
  type CheckoutCurrencyCodeUpdated,
  type CheckoutPromoCodeAdded,
  type CheckoutDeliveryGroupAddressUpdated,
  type CheckoutDeliveryGroupAddressCleared,
  type CheckoutDeliveryGroupRemoved,
} from "./events";
import { Money } from "@shopana/shared-money";
import { coerceMoney, coerceNullableMoney } from "@src/utils/money";
import {
  DeliveryMethodType,
  ShippingPaymentModel,
} from "@shopana/shipping-plugin-sdk";
import { DiscountCondition } from "@shopana/pricing-plugin-sdk";
import { AppliedDiscountSnapshot } from "./discount";

// Duplicate types from types.ts to avoid import issues
export type CheckoutLineItemState = {
  lineId: string;
  quantity: number;
  unit: {
    id: string;
    price: Money;
    compareAtPrice: Money | null;
    title: string;
    imageUrl: string | null;
    sku: string | null;
    snapshot: Record<string, unknown> | null;
  };
};

export type CheckoutDeliveryAddress = {
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
};

export type CheckoutDeliveryProvider = {
  code: string;
  data: Record<string, unknown>;
};

export type CheckoutDeliveryMethod = {
  code: string;
  deliveryMethodType: DeliveryMethodType;
  shippingPaymentModel: ShippingPaymentModel;
  provider: CheckoutDeliveryProvider;
};

export type CheckoutDeliveryGroup = {
  id: string;
  checkoutLineIds: string[];
  deliveryAddress: CheckoutDeliveryAddress | null;
  selectedDeliveryMethod: CheckoutDeliveryMethod | null;
  deliveryMethods: CheckoutDeliveryMethod[];
  shippingCost: {
    amount: Money;
    paymentModel: ShippingPaymentModel;
  } | null;
};

// removed: CheckoutPromoCode — promo codes are not part of aggregate state

export type CheckoutState = {
  id: string;
  exists: boolean;
  projectId: string;
  currencyCode: string;
  idempotencyKey: string;
  salesChannel: string;
  externalSource: string | null;
  externalId: string | null;
  localeCode: string | null;
  createdAt: Date;
  updatedAt: Date;
  subtotal: Money;
  grandTotal: Money;
  totalQuantity: number;
  apiKey: string;
  createdBy: string | null;
  number: number | null;
  status: string;
  expiresAt: Date | null;
  version: number;
  metadata: Record<string, unknown>;
  deletedAt: Date | null;
  // removed: lineItems (use linesRecord + read model)
  customerEmail: string | null;
  customerId: string | null;
  customerPhone: string | null;
  customerCountryCode: string | null;
  customerNote: string | null;
  deliveryGroups: CheckoutDeliveryGroup[];
  discountTotal: Money;
  taxTotal: Money;
  shippingTotal: Money;
  linesRecord: Record<string, CheckoutLineItemState>;
  appliedDiscounts: Array<AppliedDiscountSnapshot>;
};

export const checkoutInitialState = (): CheckoutState => ({
  id: "",
  exists: false,
  projectId: "",
  currencyCode: "",
  idempotencyKey: "",
  salesChannel: "",
  externalSource: null,
  externalId: null,
  localeCode: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  subtotal: Money.zero(),
  grandTotal: Money.zero(),
  totalQuantity: 0,
  apiKey: "",
  createdBy: null,
  number: null,
  status: "new",
  expiresAt: null,
  version: 1,
  metadata: {},
  deletedAt: null,
  customerEmail: null,
  customerId: null,
  customerPhone: null,
  customerCountryCode: null,
  customerNote: null,
  deliveryGroups: [],
  discountTotal: Money.zero(),
  taxTotal: Money.zero(),
  shippingTotal: Money.zero(),
  linesRecord: {},
  appliedDiscounts: [],
});

export const checkoutEvolve = (
  current: CheckoutState,
  event: CheckoutEvent,
): CheckoutState => {
  switch (event.type) {
    case CheckoutEventTypes.CheckoutCreated: {
      const { data, metadata } = event;
      return {
        ...current,
        id: metadata.aggregateId,
        exists: true,
        projectId: metadata.projectId,
        currencyCode: data.currencyCode,
        salesChannel: data.salesChannel,
        externalSource: data.externalSource ?? null,
        externalId: data.externalId ?? null,
        localeCode: data.localeCode ?? null,
        deliveryGroups: data.deliveryGroups.map((g) => ({
          id: g.id,
          checkoutLineIds: [],
          deliveryAddress: null,
          selectedDeliveryMethod: null,
          deliveryMethods: (g.deliveryMethods || []).map((m) => ({
            code: m.code,
            deliveryMethodType: m.deliveryMethodType,
            shippingPaymentModel: m.shippingPaymentModel,
            provider: { code: m.provider, data: {} },
          })),
          shippingCost: null,
        })),
        createdAt: metadata.now,
        updatedAt: metadata.now,
      };
    }
    case CheckoutEventTypes.CheckoutLinesAdded: {
      const d = event.data as CheckoutLinesAdded["data"];
      const linesRecord: Record<string, CheckoutLineItemState> = {};

      // Restore linesRecord from complete lines list in event
      for (const line of d.checkoutLines || []) {
        linesRecord[line.lineId] = {
          ...line,
          unit: {
            ...line.unit,
            price: coerceMoney(line.unit.price),
            compareAtPrice: coerceNullableMoney(line.unit.compareAtPrice),
          },
        };
      }

      return {
        ...current,
        linesRecord,
        subtotal: coerceMoney(d.checkoutCost.subtotal),
        discountTotal: coerceMoney(d.checkoutCost.discountTotal),
        taxTotal: coerceMoney(d.checkoutCost.taxTotal),
        shippingTotal: coerceMoney(d.checkoutCost.shippingTotal),
        grandTotal: coerceMoney(d.checkoutCost.grandTotal),
        totalQuantity: d.checkoutCost.totalQuantity,
        updatedAt: event.metadata.now,
      };
    }
    case CheckoutEventTypes.CheckoutLinesUpdated: {
      const d = event.data;
      const linesRecord: Record<string, CheckoutLineItemState> = {};

      // Restore linesRecord from complete lines list in event
      for (const line of d.checkoutLines || []) {
        linesRecord[line.lineId] = {
          ...line,
          unit: {
            ...line.unit,
            price: coerceMoney(line.unit.price),
            compareAtPrice: coerceNullableMoney(line.unit.compareAtPrice),
          },
        };
      }

      return {
        ...current,
        linesRecord,
        subtotal: coerceMoney(d.checkoutCost.subtotal),
        grandTotal: coerceMoney(d.checkoutCost.grandTotal),
        totalQuantity: d.checkoutCost.totalQuantity,
        discountTotal: coerceMoney(d.checkoutCost.discountTotal),
        taxTotal: coerceMoney(d.checkoutCost.taxTotal),
        shippingTotal: coerceMoney(d.checkoutCost.shippingTotal),
        updatedAt: event.metadata.now,
      };
    }
    case CheckoutEventTypes.CheckoutLinesDeleted: {
      const d = event.data;
      const linesRecord: Record<string, CheckoutLineItemState> = {};

      // Restore linesRecord from remaining lines in the event
      for (const line of d.checkoutLines || []) {
        linesRecord[line.lineId] = {
          ...line,
          unit: {
            ...line.unit,
            price: coerceMoney(line.unit.price),
            compareAtPrice: coerceNullableMoney(line.unit.compareAtPrice),
          },
        };
      }

      return {
        ...current,
        linesRecord,
        subtotal: coerceMoney(d.checkoutCost.subtotal),
        grandTotal: coerceMoney(d.checkoutCost.grandTotal),
        totalQuantity: d.checkoutCost.totalQuantity,
        discountTotal: coerceMoney(d.checkoutCost.discountTotal),
        taxTotal: coerceMoney(d.checkoutCost.taxTotal),
        shippingTotal: coerceMoney(d.checkoutCost.shippingTotal),
        updatedAt: event.metadata.now,
      };
    }
    case CheckoutEventTypes.CheckoutLinesCleared: {
      const d = event.data;

      return {
        ...current,
        linesRecord: {},
        deliveryGroups: [],
        subtotal: coerceMoney(d.checkoutCost.subtotal),
        grandTotal: coerceMoney(d.checkoutCost.grandTotal),
        totalQuantity: d.checkoutCost.totalQuantity,
        discountTotal: coerceMoney(d.checkoutCost.discountTotal),
        taxTotal: coerceMoney(d.checkoutCost.taxTotal),
        shippingTotal: coerceMoney(d.checkoutCost.shippingTotal),
        updatedAt: event.metadata.now,
      };
    }
    case CheckoutEventTypes.CheckoutCustomerIdentityUpdated: {
      const d = event.data as CheckoutCustomerIdentityUpdated["data"];
      return {
        ...current,
        customerEmail: d.email ?? null,
        customerId: d.customerId ?? null,
        customerPhone: d.phone ?? null,
        customerCountryCode: d.countryCode ?? null,
        updatedAt: event.metadata.now,
      };
    }
    case CheckoutEventTypes.CheckoutCustomerNoteUpdated: {
      const d = event.data as CheckoutCustomerNoteUpdated["data"];
      return {
        ...current,
        customerNote: d.note ?? null,
        updatedAt: event.metadata.now,
      };
    }
    case CheckoutEventTypes.CheckoutLanguageCodeUpdated: {
      const d = event.data as CheckoutLanguageCodeUpdated["data"];
      return {
        ...current,
        localeCode: d.localeCode ?? null,
        updatedAt: event.metadata.now,
      };
    }
    case CheckoutEventTypes.CheckoutCurrencyCodeUpdated: {
      const d = event.data as CheckoutCurrencyCodeUpdated["data"];
      return {
        ...current,
        currencyCode: d.currencyCode,
        updatedAt: event.metadata.now,
      };
    }

    // removed: CheckoutDeliveryMethodUpdated — use group-level method update
    case CheckoutEventTypes.CheckoutPromoCodeAdded: {
      const d = event.data as CheckoutPromoCodeAdded["data"];

      const linesRecord: Record<string, CheckoutLineItemState> = {};
      for (const line of d.checkoutLines || []) {
        linesRecord[line.lineId] = {
          ...line,
          unit: {
            ...line.unit,
            price: coerceMoney(line.unit.price),
            compareAtPrice: coerceNullableMoney(line.unit.compareAtPrice),
          },
        };
      }

      return {
        ...current,
        linesRecord,
        appliedDiscounts: d.appliedDiscounts,
        subtotal: coerceMoney(d.checkoutCost.subtotal),
        discountTotal: coerceMoney(d.checkoutCost.discountTotal),
        taxTotal: coerceMoney(d.checkoutCost.taxTotal),
        shippingTotal: coerceMoney(d.checkoutCost.shippingTotal),
        grandTotal: coerceMoney(d.checkoutCost.grandTotal),
        totalQuantity: d.checkoutCost.totalQuantity,
        updatedAt: event.metadata.now,
      };
    }
    case CheckoutEventTypes.CheckoutPromoCodeRemoved: {
      const d = event.data;

      const linesRecord: Record<string, CheckoutLineItemState> = {};
      for (const line of d.checkoutLines || []) {
        linesRecord[line.lineId] = {
          ...line,
          unit: {
            ...line.unit,
            price: coerceMoney(line.unit.price),
            compareAtPrice: coerceNullableMoney(line.unit.compareAtPrice),
          },
        };
      }

      return {
        ...current,
        linesRecord,
        appliedDiscounts: d.appliedDiscounts,
        subtotal: coerceMoney(d.checkoutCost.subtotal),
        discountTotal: coerceMoney(d.checkoutCost.discountTotal),
        taxTotal: coerceMoney(d.checkoutCost.taxTotal),
        shippingTotal: coerceMoney(d.checkoutCost.shippingTotal),
        grandTotal: coerceMoney(d.checkoutCost.grandTotal),
        totalQuantity: d.checkoutCost.totalQuantity,
        updatedAt: event.metadata.now,
      };
    }
    // removed: CheckoutDeliveryGroupsCreated — groups applied via CheckoutLinesAdded
    case CheckoutEventTypes.CheckoutDeliveryGroupAddressUpdated: {
      const d = event.data as CheckoutDeliveryGroupAddressUpdated["data"];
      const deliveryGroups = (current.deliveryGroups ?? []).map((group: CheckoutDeliveryGroup) => {
        if (group.id === d.deliveryGroupId) {
          return {
            ...group,
            deliveryAddress: d.address,
          };
        }
        return group;
      });

      return {
        ...current,
        deliveryGroups,
        updatedAt: event.metadata.now,
      };
    }
    case CheckoutEventTypes.CheckoutDeliveryGroupAddressCleared: {
      const d = event.data as CheckoutDeliveryGroupAddressCleared["data"];
      const deliveryGroups = (current.deliveryGroups ?? []).map((group: CheckoutDeliveryGroup) => {
        if (group.id === d.deliveryGroupId) {
          return {
            ...group,
            deliveryAddress: null,
          };
        }
        return group;
      });

      return {
        ...current,
        deliveryGroups,
        updatedAt: event.metadata.now,
      };
    }
    case CheckoutEventTypes.CheckoutDeliveryGroupMethodUpdated: {
      const { data: d } = event;
      const deliveryGroups = (current.deliveryGroups ?? []).map((group: CheckoutDeliveryGroup) => {
        if (group.id === d.deliveryGroupId) {
          return {
            ...group,
            shippingCost: d.deliveryMethod.shippingCost || null,
            selectedDeliveryMethod: {
              code: d.deliveryMethod.code,
              shippingPaymentModel: d.deliveryMethod.shippingPaymentModel,
              deliveryMethodType: d.deliveryMethod.deliveryMethodType,
              provider: {
                code: d.deliveryMethod.provider,
                data: {},
              },
            },
          };
        }
        return group;
      });

      // Update shippingTotal if provided in event
      const newShippingTotal = d.shippingTotal
        ? Money.fromMinor(d.shippingTotal)
        : current.shippingTotal;

      return {
        ...current,
        deliveryGroups,
        shippingTotal: newShippingTotal,
        updatedAt: event.metadata.now,
      };
    }
    case CheckoutEventTypes.CheckoutDeliveryGroupRemoved: {
      const d = event.data as CheckoutDeliveryGroupRemoved["data"];
      const deliveryGroups = (current.deliveryGroups ?? []).filter(
        (group: CheckoutDeliveryGroup) => group.id !== d.deliveryGroupId,
      );

      // Update shippingTotal if provided in event
      const newShippingTotal = d.shippingTotal
        ? Money.fromMinor(d.shippingTotal)
        : current.shippingTotal;

      return {
        ...current,
        deliveryGroups,
        shippingTotal: newShippingTotal,
        updatedAt: event.metadata.now,
      };
    }
    default:
      return current;
  }
};
