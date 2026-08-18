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
} from "@src/interfaces/gql-storefront-api/types";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { createValidated } from "@src/utils/validation";
import { mapPlaceOrderPayload } from "@src/interfaces/gql-storefront-api/mapper/placeOrderPayload";

export const placeOrder = async (
  _parent: ApiMutation,
  args: ApiMutationPlaceOrderArgs,
  ctx: GraphQLContext,
) => {
  const dto = createValidated(PlaceOrderDto, args.input);
  const { broker, logger } = App.getInstance();
  const input: PlaceOrderWorkflowInput = {
    organizationId: ctx.organizationId,
    storeId: ctx.store.id,
    checkoutId: dto.checkoutId,
    expectedResultRevision: dto.expectedResultRevision.trim(),
    idempotencyKey: uuidv7(),
    correlationId: uuidv7(),
    credentialId: ctx.storefrontAccess.credentialId,
    userId: ctx.user?.id ?? null,
    returnUrl: dto.returnUrl?.trim() || null,
  };

  try {
    const result = await broker.runWorkflow<
      PlaceOrderWorkflowResult,
      PlaceOrderWorkflowInput
    >(
      "checkout.placeOrder",
      input,
      {
        source: "client",
        clientKey: `${input.idempotencyKey}:${placeOrderRequestHash(input)}`,
        organizationId: input.organizationId,
        apiKeyId: input.credentialId,
      },
    );

    return mapPlaceOrderPayload(result, {
      placementId: result.placementId,
      checkoutId: input.checkoutId,
      resultRevision: input.expectedResultRevision,
    });
  } catch (error) {
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
