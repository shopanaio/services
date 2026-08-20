import {
  type ApiCustomer,
  ApiCountryCode,
  ApiCurrencyCode,
  ApiLocaleCode,
  type ApiOrder,
  ApiOrderDeliveryMethodType,
  ApiOrderDeliveryStatus,
  ApiOrderFulfillmentStatus,
  ApiOrderPaymentFlow,
  type ApiOrderPaymentMethod,
  ApiOrderPaymentStatus,
  ApiOrderStatus,
} from "@src/interfaces/gql-storefront-api/types";
import type { OrderReadView } from "@src/application/read/orderReadRepository";
import { moneyToApi } from "@src/interfaces/gql-storefront-api/mapper/money";
import { mapOrderLineReadToApi } from "@src/interfaces/gql-storefront-api/mapper/orderLine";
import { encodeGlobalIdByType, GlobalIdEntity } from "@src/interfaces/gql-storefront-api/idCodec";

/**
 * Maps Order read-model snapshot to GraphQL ApiOrder type.
 */
export function mapOrderReadToApi(read: OrderReadView): ApiOrder {
  if (!Object.values(ApiOrderStatus).includes(read.status as ApiOrderStatus)) {
    console.warn(`Invalid order status "${read.status}" for order ${read.id}, defaulting to DRAFT`);

    throw new Error(`Invalid order status "${read.status}" for order ${read.id}`);
  }

  const lines = read.lineItems.map(mapOrderLineReadToApi);
  const lineById = new Map(read.lineItems.map((line, index) => [line.id, lines[index]!]));
  const paymentMethod = mapPaymentMethod(read);
  const unavailableAction = {
    __typename: "OrderSelfServiceAction" as const,
    available: false,
    expiresAt: null,
    unavailableReasonCode: "POST_ORDER_ACTION_NOT_MATERIALIZED",
    unavailableReason: "This post-order action is not available.",
  };
  const api: ApiOrder = {
    __typename: "Order",
    id: encodeGlobalIdByType(read.id, GlobalIdEntity.Order),
    status: read.status as ApiOrderStatus,
    number: read.number,
    fulfillmentStatus: enumValue(
      ApiOrderFulfillmentStatus,
      read.fulfillmentStatus,
      "fulfillment status",
    )!,
    deliveryStatus: enumValue(ApiOrderDeliveryStatus, read.deliveryStatus, "delivery status")!,
    channelCode: read.salesChannel,
    localeCode: enumValue(ApiLocaleCode, read.localeCode, "locale code"),
    currencyCode: enumValue(ApiCurrencyCode, read.currencyCode, "currency code")!,
    customerIdentity: {
      __typename: "OrderCustomerIdentity",
      customer: read.customerId
        ? ({
            __typename: "Customer",
            id: encodeGlobalIdByType(read.customerId, GlobalIdEntity.Customer),
          } as ApiCustomer)
        : null,
      email: read.customerEmail,
      phone: read.customerPhoneE164,
      countryCode: enumValue(ApiCountryCode, read.customerCountryCode, "country code"),
      firstName: read.customerFirstName,
      lastName: read.customerLastName,
      middleName: read.customerMiddleName,
    },
    customerNote: read.customerNote,
    cost: {
      __typename: "OrderCost",
      subtotalAmount: moneyToApi(read.subtotal),
      totalAmount: moneyToApi(read.grandTotal),
      totalDiscountAmount: moneyToApi(read.discountTotal),
      totalShippingAmount: moneyToApi(read.shippingTotal),
      totalTaxAmount: moneyToApi(read.taxTotal),
    },
    totalQuantity: read.totalQuantity,
    lines,
    appliedPromoCodes: read.appliedPromoCodes.map((promoCode) => ({
      __typename: "OrderPromoCode",
      code: promoCode.code,
      discountType: promoCode.discountType,
      value: promoCode.value,
      provider: promoCode.provider,
      conditions: promoCode.conditions,
      appliedAt: promoCode.appliedAt.toISOString(),
    })),
    deliveryGroups: read.deliveryGroups.map((group) => {
      const address = group.addressId ? read.deliveryAddresses.get(group.addressId) : null;
      const recipient = group.recipientId ? read.recipients.get(group.recipientId) : null;
      const method = read.deliveryMethods
        .get(group.id)
        ?.find(
          (candidate) =>
            candidate.code === group.selectedDeliveryMethodCode &&
            candidate.provider === group.selectedDeliveryMethodProvider,
        );
      return {
        __typename: "OrderDeliveryGroup" as const,
        id: encodeGlobalIdByType(group.id, GlobalIdEntity.OrderDeliveryGroup),
        address: address
          ? {
              __typename: "OrderDeliveryAddress" as const,
              id: encodeGlobalIdByType(address.id, GlobalIdEntity.OrderDeliveryAddress),
              address1: address.address1,
              address2: address.address2,
              city: address.city,
              countryCode: enumValue(ApiCountryCode, address.countryCode, "delivery country code"),
              provinceCode: address.provinceCode,
              postalCode: address.postalCode,
            }
          : null,
        recipient: recipient
          ? {
              __typename: "OrderRecipient" as const,
              firstName: recipient.firstName,
              lastName: recipient.lastName,
              middleName: recipient.middleName,
              email: recipient.email,
              phone: recipient.phone,
            }
          : null,
        method: method
          ? {
              __typename: "OrderDeliveryMethod" as const,
              code: method.code,
              providerCode: method.provider,
              type: enumValue(
                ApiOrderDeliveryMethodType,
                method.deliveryMethodType,
                "delivery method type",
              )!,
              paymentModel: method.paymentModel,
            }
          : null,
        lines: group.lineItemIds.flatMap((lineId) => {
          const line = lineById.get(lineId);
          return line ? [line] : [];
        }),
        createdAt: group.createdAt.toISOString(),
        updatedAt: group.updatedAt.toISOString(),
      };
    }),
    fulfillments: [],
    payment: {
      __typename: "OrderPayment",
      status: enumValue(ApiOrderPaymentStatus, read.paymentStatus, "payment status")!,
      method: paymentMethod,
      authorizedAmount: moneyToApi(read.paymentAuthorized),
      capturedAmount: moneyToApi(read.paymentCaptured),
      refundedAmount: moneyToApi(read.paymentRefunded),
      outstandingAmount: moneyToApi(read.paymentOutstanding),
      transactions: [],
      refunds: [],
      voids: [],
      retry: {
        __typename: "OrderPaymentRetry",
        available: false,
        expiresAt: null,
        unavailableReasonCode: "PAYMENT_RETRY_NOT_MATERIALIZED",
        unavailableReason: "Payment retry state is not available.",
      },
    },
    paymentMethod,
    selfService: {
      __typename: "OrderSelfService",
      cancel: { ...unavailableAction },
      reorder: { ...unavailableAction },
      requestReturn: { ...unavailableAction },
      retryPayment: { ...unavailableAction },
    },
    returnRequests: {
      __typename: "OrderReturnRequestConnection",
      edges: [],
      nodes: [],
      totalCount: 0,
      pageInfo: {
        __typename: "PageInfo",
        startCursor: null,
        endCursor: null,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
    placedAt: read.placedAt?.toISOString() ?? null,
    closedAt: read.closedAt?.toISOString() ?? null,
    expiresAt: read.expiresAt?.toISOString() ?? null,
    createdAt: read.createdAt.toISOString(),
    updatedAt: read.updatedAt.toISOString(),
  };

  return api;
}

function mapPaymentMethod(read: OrderReadView): ApiOrderPaymentMethod | null {
  if (!read.selectedPaymentMethod) return null;
  const method = read.paymentMethods.find(
    (candidate) =>
      candidate.code === read.selectedPaymentMethod?.code &&
      candidate.provider === read.selectedPaymentMethod.provider,
  );
  if (!method) return null;
  return {
    __typename: "OrderPaymentMethod",
    code: method.code,
    providerCode: method.provider,
    flow: enumValue(ApiOrderPaymentFlow, method.flow, "payment flow")!,
  };
}

function enumValue<T extends Record<string, string>>(
  values: T,
  value: string | null,
  label: string,
): T[keyof T] | null {
  if (value === null || value.trim() === "") return null;
  const allowed = Object.values(values);
  if (!allowed.includes(value)) throw new Error(`Invalid ${label} "${value}"`);
  return value as T[keyof T];
}
