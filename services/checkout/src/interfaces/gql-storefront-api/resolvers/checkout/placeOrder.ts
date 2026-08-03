import { v7 as uuidv7 } from "uuid";
import { GlobalIdEntity, encodeGlobalIdByType } from "@shopana/shared-graphql-guid";
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
    expectedCheckoutVersion: dto.expectedCheckoutVersion,
    expectedResultRevision: dto.expectedResultRevision.trim(),
    idempotencyKey: dto.idempotencyKey.trim(),
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

    return {
      ...result,
      orderId: encodeGlobalIdByType(result.orderId, GlobalIdEntity.Order),
      customerAction: result.customerAction
        ? {
            type: result.customerAction.type,
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
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error(
      {
        reason,
        checkoutId: dto.checkoutId,
        expectedCheckoutVersion: dto.expectedCheckoutVersion,
      },
      "Place order failed",
    );
    throw await fromDomainError(error);
  }
};
