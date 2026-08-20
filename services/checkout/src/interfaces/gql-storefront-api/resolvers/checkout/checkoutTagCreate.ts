import { App } from "@src/ioc/container";
import type {
  ApiMutation,
  ApiMutationCheckoutTagCreateArgs,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutTagCreateDto } from "@src/application/dto/checkoutTag.dto";
import { createValidated } from "@src/utils/validation";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";

/**
 * checkoutTagCreate(input: CheckoutTagCreateInput!): Checkout!
 */
export const checkoutTagCreate = async (
  _parent: ApiMutation,
  args: ApiMutationCheckoutTagCreateArgs,
  ctx: GraphQLContext,
) => {
  const app = App.getInstance();
  const { checkoutUsecase, logger } = app;
  const dto = createValidated(CheckoutTagCreateDto, args.input);

  try {
    const checkout = await checkoutUsecase.createCheckoutTag.execute({
      checkoutId: dto.checkoutId,
      tag: {
        slug: dto.tag.slug,
        isUnique: dto.tag.unique,
      },
      storefrontAccess: ctx.storefrontAccess,
      visitorId: ctx.visitorId,
      store: ctx.store,
      customer: ctx.customer,
      user: ctx.user,
    });

    return { checkout: mapCommittedCheckoutToApi(checkout), userErrors: [] };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason }, "checkoutTagCreate domain error");
    throw await fromDomainError(err);
  }
};
