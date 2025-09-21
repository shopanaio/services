import type { Money } from "@shopana/shared-money";

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
  value: number;
  provider: string;
  conditions: unknown;
}>;

export type CheckoutNotification = Readonly<{
  id: string;
  code: string; // CheckoutNotificationCode
  severity: "INFO" | "WARNING";
  isDismissed: boolean;
}>;

export type CheckoutLine = Readonly<{
  id: string;
  // В GraphQL есть отдельный файл checkoutLine.graphql — здесь оставляем маркеры для дальнейшего расширения
}>;

export type CheckoutDeliveryGroup = Readonly<{
  id: string;
  // См. checkoutDelivery.graphql — можно детализировать при необходимости
}>;

export type Checkout = Readonly<{
  id: string;
  createdAt: string; // DateTime ISO
  updatedAt: string; // DateTime ISO
  cost: CheckoutCost;
  customerIdentity: CheckoutCustomerIdentity;
  customerNote: string | null;
  totalQuantity: number;
  lines: CheckoutLine[];
  notifications: CheckoutNotification[];
  deliveryGroups: CheckoutDeliveryGroup[];
  appliedPromoCodes: CheckoutPromoCode[];
}>;

