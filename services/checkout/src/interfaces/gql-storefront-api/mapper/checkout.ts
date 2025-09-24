import type { ApiCheckout } from "@src/interfaces/gql-storefront-api/types";
import { moneyToApi } from "@src/interfaces/gql-storefront-api/mapper/money";
import type { CheckoutReadView } from "@src/application/read/checkoutReadRepository";
import { mapCheckoutLineReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkoutLine";
import {
  encodeCheckoutDeliveryAddressId,
  encodeCheckoutDeliveryGroupId,
  encodeCheckoutId,
  encodeUserId,
} from "@src/interfaces/gql-storefront-api/idCodec";

export function mapCheckoutReadToApi(read: CheckoutReadView): ApiCheckout {
  return {
    __typename: "Checkout",
    id: encodeCheckoutId(read.id),
    createdAt: read.createdAt.toISOString(),
    updatedAt: read.updatedAt.toISOString(),
    totalQuantity: read.totalQuantity,
    notifications: [],
    lines: read.lineItems.map(mapCheckoutLineReadToApi),
    customerIdentity: {
      __typename: "CheckoutCustomerIdentity" as const,
      countryCode: read.customerCountryCode,
      /** Customer is being resolved by another subgraph */
      customer: read.customerId ? { id: encodeUserId(read.customerId) } : null,
      email: read.customerEmail,
      phone: read.customerPhoneE164,
    },
    customerNote: read.customerNote,
    cost: {
      __typename: "CheckoutCost",
      subtotalAmount: moneyToApi(read.subtotal),
      totalAmount: moneyToApi(read.grandTotal),
      totalDiscountAmount: moneyToApi(read.discountTotal),
      totalTaxAmount: moneyToApi(read.taxTotal),
      totalShippingAmount: moneyToApi(read.shippingTotal),
    },
    appliedPromoCodes: read.appliedPromoCodes.map((promo) => ({
      __typename: "CheckoutPromoCode",
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
          __typename: "CheckoutDeliveryMethod" as const,
          code: method.code,
          deliveryMethodType:
            method.deliveryMethodType === "PICKUP"
              ? ("PICKUP" as const)
              : ("SHIPPING" as const),
          provider: {
            __typename: "CheckoutDeliveryProvider" as const,
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
        __typename: "CheckoutDeliveryGroup" as const,
        id: encodeCheckoutDeliveryGroupId(group.id),
        checkoutLines: read.lineItems
          .filter((l) => group.lineItemIds.includes(l.id))
          .map(mapCheckoutLineReadToApi),
        deliveryAddress: deliveryAddress
          ? {
              __typename: "CheckoutDeliveryAddress" as const,
              id: encodeCheckoutDeliveryAddressId(deliveryAddress.id),
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
              __typename: "CheckoutDeliveryMethod" as const,
              code: selectedMethod.code,
              deliveryMethodType:
                selectedMethod.deliveryMethodType === "PICKUP"
                  ? ("PICKUP" as const)
                  : ("SHIPPING" as const),
              provider: {
                __typename: "CheckoutDeliveryProvider" as const,
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
