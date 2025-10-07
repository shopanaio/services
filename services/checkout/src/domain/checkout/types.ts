import { Money } from "@shopana/shared-money";
import {
  DeliveryMethodType,
  ShippingPaymentModel,
} from "@shopana/plugin-sdk/shipping";
import { AppliedDiscountSnapshot } from "./discount";
import { PaymentFlow } from "@shopana/plugin-sdk/payment";

/**
 * Checkout line item state representation
 */
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
  appliedDiscounts: [],
  payment: null,
});
