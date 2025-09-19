import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutationCheckoutLinesDeleteArgs,
  ApiCheckoutMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutLinesDeleteDto } from "@src/application/dto/checkoutLinesDelete.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { createValidated } from "@src/utils/validation";

/**
 * checkoutLinesDelete(input: CheckoutLinesDeleteInput!): CheckoutLinesDeletePayload!
 */
export const checkoutLinesDelete = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutLinesDeleteArgs,
  ctx: GraphQLContext
) => {
  const { broker, logger } = App.getInstance();
  const dto = createValidated(CheckoutLinesDeleteDto, args.input);

  try {

    const checkoutId = await broker.call("checkout.removeCheckoutLines", {
      checkoutId: dto.checkoutId,
      lineIds: dto.lineIds,
      apiKey: ctx.apiKey,
      project: ctx.project,
      customer: ctx.customer,
      user: ctx.user,
    }) as string;

    const { checkoutReadRepository } = App.getInstance();
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
    logger.error(
      { reason, input: dto },
      "checkoutLinesDelete domain error"
    );
    throw await fromDomainError(err);
  }
};
