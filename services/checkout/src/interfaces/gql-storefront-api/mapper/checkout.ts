import type {
  ApiCheckout,
  ApiCountryCode,
} from "@src/interfaces/gql-storefront-api/types";
import {
  ApiCheckoutDeliveryMethodType,
  ApiPaymentFlow,
} from "@src/interfaces/gql-storefront-api/types";
import { moneyToApi } from "@src/interfaces/gql-storefront-api/mapper/money";
import type { CheckoutReadView } from "@src/application/read/checkoutReadRepository";
import { mapCheckoutLineReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkoutLine";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { encodeGlobalIdByType } from "@src/interfaces/gql-storefront-api/idCodec";
import { PaymentFlow } from "@shopana/plugin-sdk/payment";

/**
 * Maps PaymentFlow from payment-plugin-sdk to ApiPaymentFlow for GraphQL API.
 */
function mapPaymentFlowToApi(flow: PaymentFlow): ApiPaymentFlow {
  switch (flow) {
    case PaymentFlow.ONLINE:
      return ApiPaymentFlow.Online;
    case PaymentFlow.OFFLINE:
      return ApiPaymentFlow.Offline;
    case PaymentFlow.ON_DELIVERY:
      return ApiPaymentFlow.OnDelivery;
  }
}

export function mapCheckoutReadToApi(read: CheckoutReadView): ApiCheckout {
  return {
    __typename: "Checkout",
    id: encodeGlobalIdByType(read.id, GlobalIdEntity.Checkout),
    createdAt: read.createdAt.toISOString(),
    updatedAt: read.updatedAt.toISOString(),
    totalQuantity: read.totalQuantity,
    notifications: [],
    lines: read.lineItems.map(mapCheckoutLineReadToApi),
    customerIdentity: {
      __typename: "CheckoutCustomerIdentity" as const,
      countryCode: read.customerCountryCode as ApiCountryCode | null,
      /** Customer is being resolved by another subgraph */
      customer: read.customerId
        ? { id: encodeGlobalIdByType(read.customerId, GlobalIdEntity.Customer) }
        : null,
      email: read.customerEmail,
      phone: read.customerPhoneE164,
      firstName: read.customerFirstName ?? null,
      lastName: read.customerLastName ?? null,
      middleName: read.customerMiddleName ?? null,
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
        (address) => address.deliveryGroupId === group.id
      );

      const groupDeliveryMethods = read.deliveryMethods
        .filter((method) => method.deliveryGroupId === group.id)
        .map((method) => ({
          __typename: "CheckoutDeliveryMethod" as const,
          code: method.code,
          deliveryMethodType:
            method.deliveryMethodType as ApiCheckoutDeliveryMethodType,
          provider: {
            __typename: "CheckoutDeliveryProvider" as const,
            code: method.provider ?? "unknown",
            data: {},
          },
        }));

      const selectedMethod = group.selectedDeliveryMethod
        ? read.deliveryMethods.find(
            (method) =>
              method.deliveryGroupId === group.id &&
              method.code === group.selectedDeliveryMethod &&
              method.provider === group.selectedDeliveryMethodProvider
          )
        : null;

      return {
        __typename: "CheckoutDeliveryGroup" as const,
        id: encodeGlobalIdByType(
          group.id,
          GlobalIdEntity.CheckoutDeliveryGroup
        ),
        checkoutLines: read.lineItems
          .filter((l) => group.lineItemIds.includes(l.id))
          .map(mapCheckoutLineReadToApi),
        deliveryAddress: deliveryAddress
          ? {
              __typename: "CheckoutDeliveryAddress" as const,
              id: encodeGlobalIdByType(
                deliveryAddress.id,
                GlobalIdEntity.CheckoutDeliveryAddress
              ),
              address1: deliveryAddress.address1,
              address2: deliveryAddress.address2,
              city: deliveryAddress.city,
              countryCode: deliveryAddress.countryCode as ApiCountryCode,
              provinceCode: deliveryAddress.provinceCode,
              postalCode: deliveryAddress.postalCode,
              data: null,
            }
          : null,
        recipient: group.recipient
          ? {
              __typename: "CheckoutRecipient" as const,
              firstName: group.recipient.firstName,
              lastName: group.recipient.lastName,
              middleName: group.recipient.middleName,
              email: group.recipient.email,
              phone: group.recipient.phone,
            }
          : null,
        selectedDeliveryMethod: selectedMethod
          ? {
              __typename: "CheckoutDeliveryMethod" as const,
              code: selectedMethod.code,
              deliveryMethodType:
                selectedMethod.deliveryMethodType === "PICKUP"
                  ? ApiCheckoutDeliveryMethodType.Pickup
                  : ApiCheckoutDeliveryMethodType.Shipping,
              provider: {
                __typename: "CheckoutDeliveryProvider" as const,
                code: selectedMethod.provider ?? "unknown",
                data: {},
              },
            }
          : null,
        deliveryMethods: groupDeliveryMethods,
        estimatedCost: null,
      };
    }),
    payment: (() => {
      const paymentMethods = (read.payment?.methods ?? []).map((m) => ({
        __typename: "CheckoutPaymentMethod" as const,
        code: m.code,
        provider: m.provider,
        flow: mapPaymentFlowToApi(m.flow),
        metadata: m.metadata,
        /** TODO: constraints shouldn't be included, filter available methods instead */
        constraints: m.constraints
          ? {
              __typename: "CheckoutPaymentMethodConstraints" as const,
              shippingMethods: Array.from(
                m.constraints.shippingMethodCodes ?? []
              ),
            }
          : null,
      }));

      const selectedPaymentMethod =
        paymentMethods.find(
          (m) =>
            m.code &&
            m.code === read.payment?.selectedMethod?.code &&
            m.provider === read.payment?.selectedMethod?.provider
        ) ?? null;

      return {
        __typename: "CheckoutPayment" as const,
        paymentMethods,
        selectedPaymentMethod,
        payableAmount: moneyToApi(read.grandTotal),
      };
    })(),
  };
}
