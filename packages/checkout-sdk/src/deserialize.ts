import { Money } from "@shopana/shared-money";
import type {
  Checkout,
  CheckoutCost,
  CheckoutCustomerIdentity,
  CheckoutDeliveryAddress,
  CheckoutDeliveryGroup,
  CheckoutDeliveryMethod,
  CheckoutDeliveryProvider,
  CheckoutLine,
  CheckoutLineCost,
  CheckoutNotification,
  CheckoutPromoCode,
  DeliveryCost,
} from "./types";
import type {
  CheckoutDeliveryAddressDto,
  CheckoutDeliveryGroupDto,
  CheckoutDeliveryMethodDto,
  CheckoutDeliveryProviderDto,
  CheckoutDto,
  CheckoutLineDto,
  CheckoutNotificationDto,
  CheckoutPromoCodeDto,
  DeliveryCostDto,
} from "./dto";

const deserializeCost = (dto: DeliveryCostDto | null | undefined): DeliveryCost | null => {
  if (!dto) return null;
  return {
    amount: Money.fromJSON(dto.amount),
    paymentModel: dto.paymentModel,
  };
};

const deserializeLineCost = (dto: CheckoutLineDto["cost"]): CheckoutLineCost => ({
  compareAtUnitPrice: Money.fromJSON(dto.compareAtUnitPrice),
  unitPrice: Money.fromJSON(dto.unitPrice),
  discountAmount: Money.fromJSON(dto.discountAmount),
  subtotalAmount: Money.fromJSON(dto.subtotalAmount),
  taxAmount: Money.fromJSON(dto.taxAmount),
  totalAmount: Money.fromJSON(dto.totalAmount),
});

const deserializeLine = (dto: CheckoutLineDto): CheckoutLine => ({
  id: dto.id,
  title: dto.title,
  sku: dto.sku ?? null,
  imageSrc: dto.imageSrc ?? null,
  quantity: dto.quantity,
  cost: deserializeLineCost(dto.cost),
  children: dto.children.map(deserializeLine),
  purchasableId: dto.purchasableId,
  purchasable: dto.purchasable ?? null,
});

const deserializeDeliveryProvider = (
  dto: CheckoutDeliveryProviderDto,
): CheckoutDeliveryProvider => ({
  code: dto.code,
  data: dto.data,
});

const deserializeDeliveryMethod = (
  dto: CheckoutDeliveryMethodDto,
): CheckoutDeliveryMethod => ({
  code: dto.code,
  deliveryMethodType: dto.deliveryMethodType,
  provider: deserializeDeliveryProvider(dto.provider),
});

const deserializeDeliveryAddress = (
  dto: CheckoutDeliveryAddressDto | null | undefined,
): CheckoutDeliveryAddress | null => {
  if (!dto) return null;
  return {
    id: dto.id,
    address1: dto.address1,
    address2: dto.address2 ?? null,
    city: dto.city,
    countryCode: dto.countryCode,
    provinceCode: dto.provinceCode ?? null,
    postalCode: dto.postalCode ?? null,
    email: dto.email ?? null,
    firstName: dto.firstName ?? null,
    lastName: dto.lastName ?? null,
    data: dto.data,
  };
};

const deserializeDeliveryGroup = (
  dto: CheckoutDeliveryGroupDto,
): CheckoutDeliveryGroup => ({
  id: dto.id,
  checkoutLines: dto.checkoutLines.map(deserializeLine),
  deliveryAddress: deserializeDeliveryAddress(dto.deliveryAddress ?? null),
  deliveryMethods: dto.deliveryMethods.map(deserializeDeliveryMethod),
  selectedDeliveryMethod: dto.selectedDeliveryMethod
    ? deserializeDeliveryMethod(dto.selectedDeliveryMethod)
    : null,
  estimatedCost: deserializeCost(dto.estimatedCost ?? null) ?? undefined,
});

const deserializeCheckoutCost = (dto: CheckoutDto["cost"]): CheckoutCost => ({
  subtotalAmount: Money.fromJSON(dto.subtotalAmount),
  totalDiscountAmount: Money.fromJSON(dto.totalDiscountAmount),
  totalTaxAmount: Money.fromJSON(dto.totalTaxAmount),
  totalShippingAmount: Money.fromJSON(dto.totalShippingAmount),
  totalAmount: Money.fromJSON(dto.totalAmount),
});

const deserializeCustomerIdentity = (
  dto: CheckoutDto["customerIdentity"],
): CheckoutCustomerIdentity => ({
  countryCode: dto.countryCode,
  customer: dto.customer,
  email: dto.email,
  phone: dto.phone,
});

const deserializeNotification = (
  dto: CheckoutNotificationDto,
): CheckoutNotification => ({
  id: dto.id,
  code: dto.code,
  severity: dto.severity,
  isDismissed: dto.isDismissed,
});

const deserializePromoCode = (dto: CheckoutPromoCodeDto): CheckoutPromoCode => ({
  code: dto.code,
  appliedAt: dto.appliedAt,
  discountType: dto.discountType,
  value: typeof dto.value === "number" ? dto.value : Money.fromJSON(dto.value),
  provider: dto.provider,
  conditions: dto.conditions,
});

export const deserializeCheckout = (dto: CheckoutDto): Checkout => ({
  id: dto.id,
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
  cost: deserializeCheckoutCost(dto.cost),
  customerIdentity: deserializeCustomerIdentity(dto.customerIdentity),
  customerNote: dto.customerNote,
  totalQuantity: dto.totalQuantity,
  lines: dto.lines.map(deserializeLine),
  notifications: dto.notifications.map(deserializeNotification),
  deliveryGroups: dto.deliveryGroups.map(deserializeDeliveryGroup),
  appliedPromoCodes: dto.appliedPromoCodes.map(deserializePromoCode),
});
