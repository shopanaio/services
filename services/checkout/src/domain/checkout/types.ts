import { Money } from "@shopana/shared-money";
import {
  DeliveryMethodType,
  ShippingPaymentModel,
} from "@shopana/plugin-sdk/shipping";
import { AppliedDiscountSnapshot } from "./discount";
import { PaymentFlow } from "@shopana/plugin-sdk/payment";

/**
 * Price adjustment type for child items in a bundle.
 * Values are always positive - the type determines the operation.
 */
export enum ChildPriceType {
  /** Item is free (price = 0) */
  FREE = "FREE",
  /** Use original price without adjustments */
  BASE = "BASE",
  /** Subtract fixed amount from original price */
  DISCOUNT_AMOUNT = "DISCOUNT_AMOUNT",
  /** Subtract percentage from original price */
  DISCOUNT_PERCENT = "DISCOUNT_PERCENT",
  /** Add fixed amount to original price */
  MARKUP_AMOUNT = "MARKUP_AMOUNT",
  /** Add percentage to original price */
  MARKUP_PERCENT = "MARKUP_PERCENT",
  /** Override with fixed price */
  OVERRIDE = "OVERRIDE",
}

/**
 * Price configuration for child items
 */
export type ChildPriceConfig = {
  type: ChildPriceType;
  /** Amount in minor units, for DISCOUNT_AMOUNT, MARKUP_AMOUNT, OVERRIDE (always positive) */
  amount?: number;
  /** Percentage for DISCOUNT_PERCENT, MARKUP_PERCENT (e.g., 10 for 10%, always positive) */
  percent?: number;
};

/**
 * Checkout line item state representation
 */
export type CheckoutLineItemState = {
  lineId: string;
  /** Parent line ID for child items (null for parent/standalone items) */
  parentLineId: string | null;
  /** Price configuration for child items (null for parent/standalone items) */
  priceConfig: ChildPriceConfig | null;
  quantity: number;
  tag: {
    id: string;
    slug: string;
    isUnique: boolean;
  } | null;
  unit: {
    id: string;
    price: Money;
    /** Original price before any adjustments */
    originalPrice: Money;
    compareAtPrice: Money | null;
    title: string;
    imageUrl: string | null;
    sku: string | null;
    snapshot: Record<string, unknown> | null;
  };
};

/**
 * Checkout delivery address
 */
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

/**
 * Checkout delivery provider
 */
export type CheckoutDeliveryProvider = {
  code: string;
  data: Record<string, unknown>;
};

/**
 * Checkout delivery method
 */
export type CheckoutDeliveryMethod = {
  code: string;
  deliveryMethodType: DeliveryMethodType;
  shippingPaymentModel: ShippingPaymentModel;
  provider: CheckoutDeliveryProvider;
  customerInput?: Record<string, unknown> | null;
};

/**
 * Checkout delivery group
 */
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

/**
 * Complete checkout aggregate state
 */
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
  customerEmail: string | null;
  customerId: string | null;
  customerPhone: string | null;
  customerCountryCode: string | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerMiddleName: string | null;
  customerNote: string | null;
  deliveryGroups: CheckoutDeliveryGroup[];
  discountTotal: Money;
  taxTotal: Money;
  shippingTotal: Money;
  linesRecord: Record<string, CheckoutLineItemState>;
  tagsRecord: Record<string, {
    id: string;
    slug: string;
    isUnique: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  appliedDiscounts: Array<AppliedDiscountSnapshot>;
  payment: {
    methods: Array<{
      code: string;
      provider: string;
      flow: PaymentFlow;
      metadata: Record<string, unknown> | null;
    }>;
    selectedMethod: string | null;
    payableAmount: Money;
  } | null;
};

/**
 * Creates initial checkout state
 */
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
  customerFirstName: null,
  customerLastName: null,
  customerMiddleName: null,
  customerNote: null,
  deliveryGroups: [],
  discountTotal: Money.zero(),
  taxTotal: Money.zero(),
  shippingTotal: Money.zero(),
  linesRecord: {},
  tagsRecord: {},
  appliedDiscounts: [],
  payment: null,
});
