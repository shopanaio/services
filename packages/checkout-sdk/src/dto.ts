import type { MoneySnapshot } from "@shopana/shared-money";
import type {
  DeliveryMethodType,
  ShippingPaymentModel,
} from "@shopana/plugin-sdk/shipping";
import type { ChildPriceType } from "./types";

export type CheckoutCostDto = Readonly<{
  subtotalAmount: MoneySnapshot;
  totalDiscountAmount: MoneySnapshot;
  totalTaxAmount: MoneySnapshot;
  totalShippingAmount: MoneySnapshot;
  totalAmount: MoneySnapshot;
}>;

export type CheckoutCustomerIdentityDto = Readonly<{
  countryCode: string | null;
  customer: { id: string } | null;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
}>;

export type CheckoutPromoCodeDto = Readonly<{
  code: string;
  appliedAt: string;
  discountType: string;
  value: number | MoneySnapshot;
  provider: string;
  conditions: unknown;
}>;

export type CheckoutNotificationDto = Readonly<{
  id: string;
  code: string;
  severity: "INFO" | "WARNING";
  isDismissed: boolean;
}>;

export type CheckoutLineCostDto = Readonly<{
  compareAtUnitPrice: MoneySnapshot | null;
  unitPrice: MoneySnapshot;
  discountAmount: MoneySnapshot;
  subtotalAmount: MoneySnapshot;
  taxAmount: MoneySnapshot;
  totalAmount: MoneySnapshot;
}>;

/**
 * Price configuration for child items
 */
export type CheckoutLinePriceConfigDto = Readonly<{
  type: ChildPriceType;
  amount: number | null;
  percent: number | null;
}>;

/**
 * Tag associated with a checkout line
 */
export type CheckoutLineTagDto = Readonly<{
  id: string;
  slug: string;
  isUnique: boolean;
}>;

export type CheckoutLineDto = Readonly<{
  id: string;
  title: string;
  sku?: string | null;
  imageSrc?: string | null;
  quantity: number;
  cost: CheckoutLineCostDto;
  children: CheckoutLineDto[];
  purchasableId: string;
  purchasable?: unknown | null;
  /** Original price before bundle adjustments */
  originalPrice?: MoneySnapshot | null;
  /** Price configuration for child items in bundles */
  priceConfig?: CheckoutLinePriceConfigDto | null;
  /** Tag associated with this line */
  tag?: CheckoutLineTagDto | null;
  /** Parent line ID for child items */
  parentLineId?: string | null;
}>;

export type CheckoutDeliveryProviderDto = Readonly<{
  code: string;
  data: unknown;
}>;

export type CheckoutDeliveryMethodDto = Readonly<{
  code: string;
  deliveryMethodType: DeliveryMethodType;
  shippingPaymentModel: ShippingPaymentModel;
  provider: CheckoutDeliveryProviderDto;
}>;

export type DeliveryCostDto = Readonly<{
  amount: MoneySnapshot;
  paymentModel: ShippingPaymentModel;
}>;

export type CheckoutDeliveryAddressDto = Readonly<{
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
  phone: string | null;
  data?: unknown;
}>;

export type CheckoutDeliveryGroupDto = Readonly<{
  id: string;
  checkoutLines: CheckoutLineDto[];
  deliveryAddress?: CheckoutDeliveryAddressDto | null;
  deliveryMethods: CheckoutDeliveryMethodDto[];
  selectedDeliveryMethod?: CheckoutDeliveryMethodDto | null;
  shippingCost: DeliveryCostDto | null;
}>;

export type CheckoutDto = Readonly<{
  id: string;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  currencyCode?: string;
  idempotencyKey?: string;
  salesChannel?: string;
  externalSource: string | null;
  externalId: string | null;
  localeCode: string | null;
  cost: CheckoutCostDto;
  customerIdentity: CheckoutCustomerIdentityDto;
  customerNote: string | null;
  totalQuantity: number;
  lines: CheckoutLineDto[];
  notifications: CheckoutNotificationDto[];
  deliveryGroups: CheckoutDeliveryGroupDto[];
  appliedPromoCodes: CheckoutPromoCodeDto[];
  apiKey?: string;
  createdBy: string | null;
  number: number | null;
  status?: string;
  expiresAt: string | null;
  version?: number;
  metadata?: Record<string, unknown>;
  deletedAt: string | null;
}>;
