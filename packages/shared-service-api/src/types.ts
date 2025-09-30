export type CheckoutMoney = Readonly<{
  currencyCode: string;
  amount: number; // minor units or major depends on shared convention
}>;

export type CheckoutLineSnapshot = Readonly<{
  id: string;
  purchasableId: string;
  quantity: number;
  unitPrice: CheckoutMoney;
  totalPrice: CheckoutMoney;
  title?: string;
  sku?: string;
  imageUrl?: string;
  data?: Record<string, unknown>;
}>;

export type CheckoutAddress = Readonly<{
  countryCode: string;
  city?: string;
  postalCode?: string;
  line1?: string;
  line2?: string;
  phone?: string;
  recipient?: string;
}>;

export type CheckoutAggregate = Readonly<{
  id: string;
  projectId: string;
  customerId: string | null;
  currencyCode: string;
  localeCode?: string | null;
  items: CheckoutLineSnapshot[];
  shippingAddress?: CheckoutAddress | null;
  billingAddress?: CheckoutAddress | null;
  subtotal: CheckoutMoney;
  shippingTotal?: CheckoutMoney | null;
  discountTotal?: CheckoutMoney | null;
  total: CheckoutMoney;
}>;
