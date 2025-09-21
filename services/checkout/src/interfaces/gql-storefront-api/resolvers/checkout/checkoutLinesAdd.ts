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
    const checkoutId = await checkoutUsecase.addCheckoutLines.execute({
      checkoutId: dto.checkoutId,
      lines: dto.lines.map((l) => ({
        quantity: l.quantity,
        purchasableId: l.purchasableId,
        purchasableSnapshot: l.purchasableSnapshot ?? null,
      })),
      apiKey: ctx.apiKey,
      project: ctx.project,
      customer: ctx.customer,
      user: ctx.user,
    });
    const checkout = await checkoutReadRepository.findById(checkoutId);
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
