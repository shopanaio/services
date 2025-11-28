import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutation,
  ApiCheckoutMutationCheckoutTagCreateArgs,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutTagCreateDto } from "@src/application/dto/checkoutTag.dto";
import { createValidated } from "@src/utils/validation";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";

/**
 * checkoutTagCreate(input: CheckoutTagCreateInput!): Checkout!
 */
export const checkoutTagCreate = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutTagCreateArgs,
  ctx: GraphQLContext
) => {
  const app = App.getInstance();
  const { checkoutUsecase, checkoutReadRepository, logger } = app;
  const dto = createValidated(CheckoutTagCreateDto, args.input);

  try {
    await checkoutUsecase.createCheckoutTag.execute({
      checkoutId: dto.checkoutId,
      tag: {
        slug: dto.tag.slug,
        isUnique: dto.tag.unique,
      },
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
    logger.error({ reason }, "checkoutTagCreate domain error");
    throw await fromDomainError(err);
  }
};
