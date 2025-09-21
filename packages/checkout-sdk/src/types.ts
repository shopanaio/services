import type { Money } from "@shopana/shared-money";
import { ShippingPaymentModel, DeliveryMethodType } from "@shopana/shipping-plugin-sdk";

export type CheckoutCost = Readonly<{
  subtotalAmount: Money;
  totalDiscountAmount: Money;
  totalTaxAmount: Money;
  totalShippingAmount: Money;
  totalAmount: Money;
}>;

export type CheckoutCustomerIdentity = Readonly<{
  countryCode: string | null;
  customer: { id: string } | null;
  email: string | null;
  phone: string | null;
}>;

export type CheckoutPromoCode = Readonly<{
  code: string;
  appliedAt: string; // DateTime ISO
  discountType: string;
  value: number | Money;
  provider: string;
  conditions: unknown;
}>;

export type CheckoutNotification = Readonly<{
  id: string;
  code: string; // CheckoutNotificationCode
  severity: "INFO" | "WARNING";
  isDismissed: boolean;
}>;

export type CheckoutLineCost = Readonly<{
  compareAtUnitPrice: Money;
  unitPrice: Money;
  discountAmount: Money;
  subtotalAmount: Money;
  taxAmount: Money;
  totalAmount: Money;
}>;

export type CheckoutLine = Readonly<{
  id: string;
  title: string;
  sku?: string | null;
  imageSrc?: string | null;
  quantity: number;
  cost: CheckoutLineCost;
  children: CheckoutLine[];
  purchasableId: string;
  purchasable?: unknown | null;
}>;

export type CheckoutDeliveryMethodType = DeliveryMethodType;

export type DeliveryCost = Readonly<{
  amount: Money;
  paymentModel: ShippingPaymentModel;
}>;

export type CheckoutDeliveryProvider = Readonly<{
  code: string;
  data: unknown;
}>;

export type CheckoutDeliveryMethod = Readonly<{
  code: string;
  deliveryMethodType: CheckoutDeliveryMethodType;
  shippingPaymentModel: ShippingPaymentModel;
  provider: CheckoutDeliveryProvider;
}>;

export type CheckoutDeliveryAddress = Readonly<{
  id: string;
  address1: string;
  address2?: string | null;
  city: string;
  countryCode: string; // CountryCode
  provinceCode?: string | null;
  postalCode?: string | null;
  email?: string | null; // Email
  firstName?: string | null;
  lastName?: string | null;
  phone: string | null;
  data?: unknown;
}>;

export type CheckoutDeliveryGroup = Readonly<{
  id: string;
  checkoutLines: CheckoutLine[];
  deliveryAddress?: CheckoutDeliveryAddress | null;
  deliveryMethods: CheckoutDeliveryMethod[];
  selectedDeliveryMethod?: CheckoutDeliveryMethod | null;
  shippingCost: DeliveryCost | null;
}>;

export type Checkout = Readonly<{
  id: string;
  createdAt: string; // DateTime ISO
  updatedAt: string; // DateTime ISO
  projectId?: string;
  currencyCode?: string;
  idempotencyKey?: string;
  salesChannel?: string;
  externalSource: string | null;
  externalId: string | null;
  localeCode: string | null;
  cost: CheckoutCost;
  customerIdentity: CheckoutCustomerIdentity;
  customerNote: string | null;
  totalQuantity: number;
  lines: CheckoutLine[];
  notifications: CheckoutNotification[];
  deliveryGroups: CheckoutDeliveryGroup[];
  appliedPromoCodes: CheckoutPromoCode[];
  apiKey?: string;
  createdBy: string | null;
  number: number | null;
  status?: string;
  expiresAt: string | null; // DateTime ISO
  version?: number;
  metadata?: Record<string, unknown>;
  deletedAt: string | null; // DateTime ISO
}>;
