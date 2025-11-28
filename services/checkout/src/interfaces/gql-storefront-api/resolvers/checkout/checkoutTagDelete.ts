import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutation,
  ApiCheckoutMutationCheckoutTagDeleteArgs,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutTagDeleteDto } from "@src/application/dto/checkoutTag.dto";
import { createValidated } from "@src/utils/validation";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";

/**
 * checkoutTagDelete(input: CheckoutTagDeleteInput!): Checkout!
 */
export const checkoutTagDelete = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutTagDeleteArgs,
  ctx: GraphQLContext
) => {
  const app = App.getInstance();
  const { checkoutUsecase, checkoutReadRepository, logger } = app;
  const dto = createValidated(CheckoutTagDeleteDto, args.input);

  try {
    await checkoutUsecase.deleteCheckoutTag.execute({
      checkoutId: dto.checkoutId,
      tagId: dto.tagId,
      apiKey: ctx.apiKey,
      project: ctx.project,
      customer: ctx.customer,
      user: ctx.user,
    });

    const checkout = await checkoutReadRepository.findById(dto.checkoutId);
    if (!checkout) {
      return null;
    }

    return mapCheckoutReadToApi(checkout);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason }, "checkoutTagDelete domain error");
    throw await fromDomainError(err);
  }
};
