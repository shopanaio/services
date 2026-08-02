import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutationCheckoutPromoCodeAddArgs,
  ApiCheckoutMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutPromoCodeAddDto } from "@src/application/dto/checkoutPromoCodes.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
import { createValidated } from "@src/utils/validation";
// Removed idCodec imports as validation/transformation now happens in DTO

/**
 * checkoutPromoCodeAdd(input: CheckoutPromoCodeAddInput!): Checkout!
 */
export const checkoutPromoCodeAdd = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutPromoCodeAddArgs,
  ctx: GraphQLContext
) => {
  const app = App.getInstance();
  const { checkoutUsecase, logger } = app;
  const dto = createValidated(CheckoutPromoCodeAddDto, args.input);

  try {
    const checkout = await checkoutUsecase.addPromoCode.execute({
      checkoutId: dto.checkoutId, // Already decoded by validator dto.checkoutId, // Already decoded by validator
      code: dto.code,
      storefrontAccess: ctx.storefrontAccess,
      store: ctx.store,
      customer: ctx.customer,
      user: ctx.user,
    });
    return mapCommittedCheckoutToApi(checkout);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason, checkoutId: dto.checkoutId }, "promoCodeAdd error");
    throw await fromDomainError(err);
  }
};
