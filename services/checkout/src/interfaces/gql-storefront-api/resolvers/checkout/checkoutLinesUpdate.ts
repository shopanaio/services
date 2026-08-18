import { App } from "@src/ioc/container";
import type {
  ApiMutationCheckoutLinesUpdateArgs,
  ApiMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutLinesUpdateDto } from "@src/application/dto/checkoutLinesUpdate.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
import { createValidated } from "@src/utils/validation";
// Removed idCodec imports as validation/transformation now happens in DTO

/**
 * checkoutLinesUpdate(input: CheckoutLinesUpdateInput!): CheckoutLinesUpdatePayload!
 */
export const checkoutLinesUpdate = async (
  _parent: ApiMutation,
  args: ApiMutationCheckoutLinesUpdateArgs,
  ctx: GraphQLContext
) => {
  const app = App.getInstance();
  const { checkoutUsecase, logger } = app;
  const dto = createValidated(CheckoutLinesUpdateDto, args.input);

  try {
    const lines = dto.lines.map((line) => ({
      lineId: line.lineId, // Already decoded by validator
      quantity: line.quantity,
    }));

    const checkout = await checkoutUsecase.updateCheckoutLines.execute({
      checkoutId: dto.checkoutId, // Already decoded by validator dto.checkoutId, // Already decoded by validator
      lines,
      storefrontAccess: ctx.storefrontAccess,
      visitorId: ctx.visitorId,
      store: ctx.store,
      customer: ctx.customer,
      user: ctx.user,
    });
    return {
      checkout: mapCommittedCheckoutToApi(checkout),
      userErrors: [],
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error(
      { reason, checkoutId: dto.checkoutId },
      "checkoutLinesUpdate domain error"
    );
    throw await fromDomainError(err);
  }
};
