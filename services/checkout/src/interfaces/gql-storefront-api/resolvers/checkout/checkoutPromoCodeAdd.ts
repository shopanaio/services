import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutationCheckoutPromoCodeAddArgs,
  ApiCheckoutMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutPromoCodeAddDto } from "@src/application/dto/checkoutPromoCodes.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { createValidated } from "@src/utils/validation";

/**
 * checkoutPromoCodeAdd(input: CheckoutPromoCodeAddInput!): Checkout!
 */
export const checkoutPromoCodeAdd = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutPromoCodeAddArgs,
  ctx: GraphQLContext
) => {
  const app = App.getInstance();
  const { checkoutUsecase, checkoutReadRepository, logger } = app;
  const dto = createValidated(CheckoutPromoCodeAddDto, args.input);

  try {
    const checkoutId = await checkoutUsecase.addPromoCode.execute({
      checkoutId: dto.checkoutId,
      code: dto.code,
      apiKey: ctx.apiKey,
      project: ctx.project,
      customer: ctx.customer,
      user: ctx.user,
    });
    const checkout = await checkoutReadRepository.findById(checkoutId);
    if (!checkout) {
      return null;
    }

    return mapCheckoutReadToApi(checkout);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason, input: dto }, "promoCodeAdd error");
    throw await fromDomainError(err);
  }
};
