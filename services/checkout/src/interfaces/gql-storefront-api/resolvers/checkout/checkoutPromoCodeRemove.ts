import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutationCheckoutPromoCodeRemoveArgs,
  ApiCheckoutMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutPromoCodeRemoveDto } from "@src/application/dto/checkoutPromoCodes.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { createValidated } from "@src/utils/validation";

/**
 * checkoutPromoCodeRemove(input: CheckoutPromoCodeRemoveInput!): Checkout!
 */
export const checkoutPromoCodeRemove = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutPromoCodeRemoveArgs,
  ctx: GraphQLContext
) => {
  const { broker, logger } = App.getInstance();
  const dto = createValidated(CheckoutPromoCodeRemoveDto, args.input);

  try {

    const checkoutId = await broker.call("checkout.removePromoCode", {
      checkoutId: dto.checkoutId,
      code: dto.code,
      apiKey: ctx.apiKey,
      project: ctx.project,
      customer: ctx.customer,
      user: ctx.user,
    }) as string;

    const { checkoutReadRepository } = App.getInstance();
    const checkout = await checkoutReadRepository.findById(checkoutId);
    if (!checkout) {
      return null;
    }

    return mapCheckoutReadToApi(checkout);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason, input: dto }, "promoCodeRemove error");
    throw await fromDomainError(err);
  }
};
