import { App } from "@src/ioc/container";
import type {
  ApiMutationCheckoutLinesClearArgs,
  ApiMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutLinesClearDto } from "@src/application/dto/checkoutLinesClear.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
import { createValidated } from "@src/utils/validation";
// Removed idCodec imports as validation/transformation now happens in DTO

/**
 * checkoutLinesClear(input: CheckoutLinesClearInput!): CheckoutLinesClearPayload!
 */
export const checkoutLinesClear = async (
  _parent: ApiMutation,
  args: ApiMutationCheckoutLinesClearArgs,
  ctx: GraphQLContext
) => {
  const app = App.getInstance();
  const { checkoutUsecase, logger } = app;
  const dto = createValidated(CheckoutLinesClearDto, args.input);

  try {
    const checkout = await checkoutUsecase.clearCheckoutLines.execute({
      checkoutId: dto.checkoutId, // Already decoded by validator dto.checkoutId, // Already decoded by validator
      storefrontAccess: ctx.storefrontAccess,
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
    logger.error({ reason, checkoutId: dto.checkoutId }, "checkoutLinesClear domain error");
    throw await fromDomainError(err);
  }
};
