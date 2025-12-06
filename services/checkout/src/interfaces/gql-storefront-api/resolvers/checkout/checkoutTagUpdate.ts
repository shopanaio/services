import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutation,
  ApiCheckoutMutationCheckoutTagUpdateArgs,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutTagUpdateDto } from "@src/application/dto/checkoutTag.dto";
import { createValidated } from "@src/utils/validation";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";

/**
 * checkoutTagUpdate(input: CheckoutTagUpdateInput!): Checkout!
 */
export const checkoutTagUpdate = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutTagUpdateArgs,
  ctx: GraphQLContext
) => {
  const app = App.getInstance();
  const { checkoutUsecase, checkoutReadRepository, logger } = app;
  const dto = createValidated(CheckoutTagUpdateDto, args.input);

  try {
    await checkoutUsecase.updateCheckoutTag.execute({
      checkoutId: dto.checkoutId,
      tagId: dto.tagId,
      slug: dto.slug,
      isUnique: dto.unique,
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
    logger.error({ reason }, "checkoutTagUpdate domain error");
    throw await fromDomainError(err);
  }
};
