import { GlobalIdEntity, encodeGlobalIdByType } from "@shopana/shared-graphql-guid";
import type {
  ApiCheckoutUserError,
  ApiPlaceOrderCustomerActionType,
  ApiPlaceOrderPayload,
  ApiPlaceOrderPaymentFailureCategory,
  ApiPlaceOrderStatus,
  ApiCheckoutPlacementState,
} from "../types.js";
import type { PlaceOrderWorkflowResult } from "../../../workflows/PlaceOrderWorkflow.js";

type PlaceOrderPayloadContext = {
  placementId: string;
  checkoutId: string;
  resultRevision: string;
  placementState?: ApiCheckoutPlacementState;
  failure?: { code: string; message: string; retryable: boolean } | null;
};

type PlaceOrderErrorContext = Omit<
  PlaceOrderPayloadContext,
  "placementId" | "checkoutId" | "resultRevision"
> & {
  checkoutId: string | null;
  resultRevision: string | null;
};

export function mapPlaceOrderPayload(
  result: PlaceOrderWorkflowResult | null,
  context: PlaceOrderPayloadContext,
): ApiPlaceOrderPayload {
  return {
    __typename: "PlaceOrderPayload",
    placementId: encodeGlobalIdByType(context.placementId, GlobalIdEntity.CheckoutPlacement),
    placementState: context.placementState ?? ("PLACED" as ApiCheckoutPlacementState),
    checkoutId: context.checkoutId
      ? encodeGlobalIdByType(context.checkoutId, GlobalIdEntity.Checkout)
      : null,
    resultRevision: context.resultRevision,
    orderId: result ? encodeGlobalIdByType(result.orderId, GlobalIdEntity.Order) : null,
    status: result ? (result.status as ApiPlaceOrderStatus) : null,
    paymentCollectionId: result?.paymentCollectionId ?? null,
    paymentSessionId: result?.paymentSessionId ?? null,
    paymentOperationId: result?.paymentOperationId ?? null,
    customerAction: result?.customerAction
      ? {
          __typename: "PlaceOrderCustomerAction",
          type: result.customerAction.type as ApiPlaceOrderCustomerActionType,
          url: result.customerAction.type === "REDIRECT" ? result.customerAction.url : null,
          title: result.customerAction.type === "INSTRUCTIONS" ? result.customerAction.title : null,
          instructions:
            result.customerAction.type === "INSTRUCTIONS"
              ? result.customerAction.instructions
              : null,
          expiresAt: result.customerAction.expiresAt,
          data: result.customerAction.type === "INSTRUCTIONS" ? result.customerAction.data : null,
        }
      : null,
    paymentFailure: result?.paymentFailure
      ? {
          __typename: "PlaceOrderPaymentFailure",
          ...result.paymentFailure,
          category: result.paymentFailure.category as ApiPlaceOrderPaymentFailureCategory,
        }
      : null,
    userErrors: context.failure
      ? [
          {
            __typename: "CheckoutUserError",
            field: [],
            code: context.failure.code,
            message: context.failure.message,
            retryable: context.failure.retryable,
          },
        ]
      : [],
  };
}

export function mapPlaceOrderErrorPayload(
  error: ApiCheckoutUserError,
  context: PlaceOrderErrorContext,
): ApiPlaceOrderPayload {
  return {
    __typename: "PlaceOrderPayload",
    placementId: null,
    placementState: null,
    checkoutId: context.checkoutId
      ? encodeGlobalIdByType(context.checkoutId, GlobalIdEntity.Checkout)
      : null,
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
