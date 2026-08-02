import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutation,
  ApiCheckoutMutationCheckoutTagDeleteArgs,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutTagDeleteDto } from "@src/application/dto/checkoutTag.dto";
import { createValidated } from "@src/utils/validation";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
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
  const { checkoutUsecase, logger } = app;
  const dto = createValidated(CheckoutTagDeleteDto, args.input);

  try {
    const checkout = await checkoutUsecase.deleteCheckoutTag.execute({
      checkoutId: dto.checkoutId,
      tagId: dto.tagId,
      storefrontAccess: ctx.storefrontAccess,
      store: ctx.store,
      customer: ctx.customer,
      user: ctx.user,
    });

    return mapCommittedCheckoutToApi(checkout);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason }, "checkoutTagDelete domain error");
    throw await fromDomainError(err);
  }
};
