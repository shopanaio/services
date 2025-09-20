import type { ApiOrder } from "@src/interfaces/gql-storefront-api/types";
import { moneyToApi } from "@src/interfaces/gql-storefront-api/mapper/money";
import type { OrderReadView } from "@src/application/read/orderReadRepository";
import { mapOrderLineReadToApi } from "@src/interfaces/gql-storefront-api/mapper/orderLine";

export function mapOrderReadToApi(read: OrderReadView): ApiOrder {
  return {
    __typename: "Order",
    id: read.id,
    createdAt: read.createdAt.toISOString(),
    updatedAt: read.updatedAt.toISOString(),
    totalQuantity: read.totalQuantity,
    notifications: [],
    lines: read.lineItems.map(mapOrderLineReadToApi),
    customerIdentity: {
      __typename: "OrderCustomerIdentity" as const,
      countryCode: read.customerCountryCode,
      /** Customer is being resolved by another subgraph */
      customer: read.customerId ? { id: read.customerId } : null,
      email: read.customerEmail,
      phone: read.customerPhoneE164,
    },
    customerNote: read.customerNote,
    cost: {
      __typename: "OrderCost",
      subtotalAmount: moneyToApi(read.subtotal),
      totalAmount: moneyToApi(read.grandTotal),
      totalDiscountAmount: moneyToApi(read.discountTotal),
      totalTaxAmount: moneyToApi(read.taxTotal),
      totalShippingAmount: moneyToApi(read.shippingTotal),
    },
    appliedPromoCodes: read.appliedPromoCodes.map((promo) => ({
      __typename: "OrderPromoCode",
      code: promo.code,
      appliedAt: promo.appliedAt.toISOString(),
      discountType: promo.discountType,
      value: promo.value,
      provider: promo.provider,
      conditions: promo.conditions,
    })),
    deliveryGroups: read.deliveryGroups.map((group) => {
      const deliveryAddress = read.deliveryAddresses.find(
        (address) => address.deliveryGroupId === group.id,
      );

      const groupDeliveryMethods = read.deliveryMethods
        .filter((method) => method.deliveryGroupId === group.id)
        .map((method) => ({
          __typename: "OrderDeliveryMethod" as const,
          code: method.code,
          deliveryMethodType:
            method.deliveryMethodType === "PICKUP"
              ? ("PICKUP" as const)
              : ("SHIPPING" as const),
          provider: {
            __typename: "OrderDeliveryProvider" as const,
            code: "unknown", // TODO: provider data not available in new schema
            data: {},
          },
        }));

      const selectedMethod = group.selectedDeliveryMethod
        ? read.deliveryMethods.find(
            (method) =>
              method.deliveryGroupId === group.id &&
              method.code === group.selectedDeliveryMethod,
          )
        : null;

      return {
        __typename: "OrderDeliveryGroup" as const,
        id: group.id,
        orderLines: read.lineItems
          .filter((l) => group.lineItemIds.includes(l.id))
          .map(mapOrderLineReadToApi),
        deliveryAddress: deliveryAddress
          ? {
              __typename: "OrderDeliveryAddress" as const,
              id: deliveryAddress.id,
              address1: deliveryAddress.address1,
              address2: deliveryAddress.address2,
              city: deliveryAddress.city,
              countryCode: deliveryAddress.countryCode,
              provinceCode: deliveryAddress.provinceCode,
              postalCode: deliveryAddress.postalCode,
              firstName: deliveryAddress.firstName,
              lastName: deliveryAddress.lastName,
              email: deliveryAddress.email,
              data: null,
            }
          : null,
        selectedDeliveryMethod: selectedMethod
          ? {
              __typename: "OrderDeliveryMethod" as const,
              code: selectedMethod.code,
              deliveryMethodType:
                selectedMethod.deliveryMethodType === "PICKUP"
                  ? ("PICKUP" as const)
                  : ("SHIPPING" as const),
              provider: {
                __typename: "OrderDeliveryProvider" as const,
                code: "unknown", // TODO: provider data not available in new schema
                data: {},
              },
            }
          : null,
        deliveryMethods: groupDeliveryMethods,
        estimatedCost: null,
      };
    }),
  };
}
