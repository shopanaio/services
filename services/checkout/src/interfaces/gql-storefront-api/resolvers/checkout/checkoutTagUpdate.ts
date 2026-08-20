import { App } from "@src/ioc/container";
import type {
  ApiMutation,
  ApiMutationCheckoutTagUpdateArgs,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutTagUpdateDto } from "@src/application/dto/checkoutTag.dto";
import { createValidated } from "@src/utils/validation";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";

/**
 * checkoutTagUpdate(input: CheckoutTagUpdateInput!): Checkout!
 */
export const checkoutTagUpdate = async (
  _parent: ApiMutation,
  args: ApiMutationCheckoutTagUpdateArgs,
  ctx: GraphQLContext,
) => {
  const app = App.getInstance();
  const { checkoutUsecase, logger } = app;
  const dto = createValidated(CheckoutTagUpdateDto, args.input);

  try {
    const checkout = await checkoutUsecase.updateCheckoutTag.execute({
      checkoutId: dto.checkoutId,
      tagId: dto.tagId,
      slug: dto.slug,
      isUnique: dto.unique,
      storefrontAccess: ctx.storefrontAccess,
      visitorId: ctx.visitorId,
      store: ctx.store,
      customer: ctx.customer,
      user: ctx.user,
    });

    return { checkout: mapCommittedCheckoutToApi(checkout), userErrors: [] };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason }, "checkoutTagUpdate domain error");
    throw await fromDomainError(err);
  }
};
