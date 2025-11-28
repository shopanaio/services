import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutationCheckoutLinesAddArgs,
  ApiCheckoutMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutLinesAddDto } from "@src/application/dto/checkoutLinesAdd.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { createValidated } from "@src/utils/validation";

/**
 * checkoutLinesAdd(input: CheckoutLinesAddInput!): CheckoutLinesAddPayload!
 */
export const checkoutLinesAdd = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutLinesAddArgs,
  ctx: GraphQLContext,
) => {
  const app = App.getInstance();
  const { checkoutUsecase, checkoutReadRepository, logger } = app;
  const dto = createValidated(CheckoutLinesAddDto, args.input);

  try {
    const lines = dto.lines.map((line) => ({
      quantity: line.quantity,
      purchasableId: line.purchasableId, // Already decoded by validator
      purchasableSnapshot: line.purchasableSnapshot ?? null,
      tagSlug: line.tagSlug ?? null,
      children: line.children?.map((child) => ({
        purchasableId: child.purchasableId,
        quantity: child.quantity,
        purchasableSnapshot: child.purchasableSnapshot ?? null,
      })) ?? null,
    }));

    const updatedCheckoutId = await checkoutUsecase.addCheckoutLines.execute({
      checkoutId: dto.checkoutId, // Already decoded by validator dto.checkoutId, // Already decoded by validator
      lines,
      apiKey: ctx.apiKey,
      project: ctx.project,
      customer: ctx.customer,
      user: ctx.user,
    });
    const checkout = await checkoutReadRepository.findById(updatedCheckoutId);
    if (!checkout) {
      return null;
    }

    return {
      checkout: mapCheckoutReadToApi(checkout),
      errors: [],
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason, input: dto }, "checkoutLinesAdd domain error");
    throw await fromDomainError(err);
  }
};
