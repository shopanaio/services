import { v7 as uuidv7 } from "uuid";
import { App } from "@src/ioc/container";
import { PlaceOrderDto } from "@src/application/dto/placeOrder.dto";
import type {
  PlaceOrderWorkflowInput,
  PlaceOrderWorkflowResult,
} from "@src/workflows/PlaceOrderWorkflow.js";
import { placeOrderRequestHash } from "@src/workflows/PlaceOrderWorkflow.js";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import type {
  ApiMutation,
  ApiMutationPlaceOrderArgs,
  ApiCheckoutPlacementState,
} from "@src/interfaces/gql-storefront-api/types";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { checkoutUserErrorFrom } from "@src/interfaces/gql-storefront-api/errors";
import { createValidated } from "@src/utils/validation";
import {
  mapPlaceOrderErrorPayload,
  mapPlaceOrderPayload,
} from "@src/interfaces/gql-storefront-api/mapper/placeOrderPayload";

const IDEMPOTENCY_PARAMETER_MISMATCH = "IDEMPOTENCY_KEY_PARAMETER_MISMATCH";

function errorCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return error instanceof Error ? error.message : null;
}

export const placeOrder = async (
  _parent: ApiMutation,
  args: ApiMutationPlaceOrderArgs,
  ctx: GraphQLContext,
) => {
  let dto: PlaceOrderDto;
  try {
    dto = createValidated(PlaceOrderDto, args.input);
  } catch (error) {
    const userError = checkoutUserErrorFrom(error, ["input"]);
    if (!userError) throw error;
    return mapPlaceOrderErrorPayload(userError, {
      checkoutId: null,
      resultRevision:
        typeof args.input.expectedResultRevision === "string"
          ? args.input.expectedResultRevision
          : null,
    });
  }
  const { broker, logger } = App.getInstance();
  const input: PlaceOrderWorkflowInput = {
    organizationId: ctx.organizationId,
    storeId: ctx.store.id,
    checkoutId: dto.checkoutId,
    expectedResultRevision: dto.expectedResultRevision.trim(),
    idempotencyKey: dto.idempotencyKey,
    correlationId: uuidv7(),
    credentialId: ctx.storefrontAccess.credentialId,
    visitorId: ctx.visitorId,
    userId: ctx.user?.id ?? null,
    returnUrl: dto.returnUrl?.trim() || null,
  };

  try {
    const result = await broker.runWorkflow<PlaceOrderWorkflowResult, PlaceOrderWorkflowInput>(
      "checkout.placeOrder",
      input,
      {
        source: "client",
        clientKey: input.idempotencyKey,
        organizationId: input.organizationId,
        apiKeyId: input.credentialId,
        requestHash: placeOrderRequestHash(input),
      },
    );

    return mapPlaceOrderPayload(result, {
      placementId: result.placementId,
      checkoutId: input.checkoutId,
      resultRevision: input.expectedResultRevision,
    });
  } catch (error) {
    const code = errorCode(error);
    if (code === "IDEMPOTENCY_CONFLICT" || code === IDEMPOTENCY_PARAMETER_MISMATCH) {
      return mapPlaceOrderErrorPayload(
        {
          __typename: "CheckoutUserError",
          field: ["input", "idempotencyKey"],
          code: IDEMPOTENCY_PARAMETER_MISMATCH,
          message: "The idempotency key has already been used with different input.",
          retryable: false,
        },
        {
          checkoutId: input.checkoutId,
          resultRevision: input.expectedResultRevision,
        },
      );
    }
    const placement =
      await App.getInstance().checkoutPlacementRepository.findByCheckoutForStorefrontOwner<PlaceOrderWorkflowResult>(
        {
          checkoutId: input.checkoutId,
          storeId: input.storeId,
          credentialId: input.credentialId,
          visitorId: input.visitorId,
        },
      );
    if (placement) {
      const failure = placement.failure ?? publicPlacementFailure(code);
      return mapPlaceOrderPayload(placement.result, {
        placementId: placement.placementId,
        checkoutId: placement.checkoutId,
        resultRevision: placement.resultRevision,
        placementState: placement.status as ApiCheckoutPlacementState,
        failure,
      });
    }
    const failure = publicPlacementFailure(code);
    if (failure) {
      return mapPlaceOrderErrorPayload(
        {
          __typename: "CheckoutUserError",
          field: ["input"],
          ...failure,
        },
        {
          checkoutId: input.checkoutId,
          resultRevision: input.expectedResultRevision,
        },
      );
    }
    const reason = error instanceof Error ? error.message : String(error);
    logger.error(
      {
        reason,
        checkoutId: dto.checkoutId,
      },
      "Place order failed",
    );
    throw await fromDomainError(error);
  }
};

function publicPlacementFailure(code: string | null) {
  if (!code || !/^(CHECKOUT|PLACE_ORDER|IDEMPOTENCY|LOYALTY)_/.test(code)) return null;
  const retryable =
    !code.endsWith("_INVALID") &&
    !code.includes("MISMATCH") &&
    !code.includes("ALREADY_PLACED") &&
    !code.includes("NOT_FOUND") &&
    !code.includes("REQUIRED");
  return {
    code,
    message: "The checkout could not be placed.",
    retryable,
  };
}
