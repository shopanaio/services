import { GlobalIdEntity, encodeGlobalIdByType } from "@shopana/shared-graphql-guid";
import type {
  ApiCheckoutUserError,
  ApiPlaceOrderCustomerActionType,
  ApiPlaceOrderPayload,
  ApiPlaceOrderPaymentFailureCategory,
  ApiPlaceOrderStatus,
} from "../types.js";
import type { PlaceOrderWorkflowResult } from "../../../workflows/PlaceOrderWorkflow.js";

type PlaceOrderPayloadContext = {
  placementId: string;
  checkoutId: string;
  resultRevision: string;
};

type PlaceOrderErrorContext = Omit<PlaceOrderPayloadContext, "placementId">;

export function mapPlaceOrderPayload(
  result: PlaceOrderWorkflowResult | null,
  context: PlaceOrderPayloadContext,
): ApiPlaceOrderPayload {
  return {
    __typename: "PlaceOrderPayload",
    placementId: encodeGlobalIdByType(
      context.placementId,
      GlobalIdEntity.CheckoutPlacement,
    ),
    checkoutId: encodeGlobalIdByType(
      context.checkoutId,
      GlobalIdEntity.Checkout,
    ),
    resultRevision: context.resultRevision,
    orderId: result
      ? encodeGlobalIdByType(result.orderId, GlobalIdEntity.Order)
      : null,
    status: result ? result.status as ApiPlaceOrderStatus : null,
    paymentCollectionId: result?.paymentCollectionId ?? null,
    paymentSessionId: result?.paymentSessionId ?? null,
    paymentOperationId: result?.paymentOperationId ?? null,
    customerAction: result?.customerAction
      ? {
          __typename: "PlaceOrderCustomerAction",
          type: result.customerAction.type as ApiPlaceOrderCustomerActionType,
          url: result.customerAction.type === "REDIRECT"
            ? result.customerAction.url
            : null,
          title: result.customerAction.type === "INSTRUCTIONS"
            ? result.customerAction.title
            : null,
          instructions: result.customerAction.type === "INSTRUCTIONS"
            ? result.customerAction.instructions
            : null,
          expiresAt: result.customerAction.expiresAt,
          data: result.customerAction.type === "INSTRUCTIONS"
            ? result.customerAction.data
            : null,
        }
      : null,
    paymentFailure: result?.paymentFailure
      ? {
          __typename: "PlaceOrderPaymentFailure",
          ...result.paymentFailure,
          category: result.paymentFailure.category as ApiPlaceOrderPaymentFailureCategory,
        }
      : null,
    userErrors: [],
  };
}

export function mapPlaceOrderErrorPayload(
  error: ApiCheckoutUserError,
  context: PlaceOrderErrorContext,
): ApiPlaceOrderPayload {
  return {
    __typename: "PlaceOrderPayload",
    placementId: null,
    checkoutId: encodeGlobalIdByType(
      context.checkoutId,
      GlobalIdEntity.Checkout,
    ),
    resultRevision: context.resultRevision,
    orderId: null,
    status: null,
    paymentCollectionId: null,
    paymentSessionId: null,
    paymentOperationId: null,
    customerAction: null,
    paymentFailure: null,
    userErrors: [error],
  };
}
