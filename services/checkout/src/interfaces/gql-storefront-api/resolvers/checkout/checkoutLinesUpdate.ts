import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutationCheckoutLinesUpdateArgs,
  ApiCheckoutMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutLinesUpdateDto } from "@src/application/dto/checkoutLinesUpdate.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { createValidated } from "@src/utils/validation";

/**
 * checkoutLinesUpdate(input: CheckoutLinesUpdateInput!): CheckoutLinesUpdatePayload!
 */
export const checkoutLinesUpdate = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutLinesUpdateArgs,
  ctx: GraphQLContext
) => {
  const { broker, logger } = App.getInstance();
  const dto = createValidated(CheckoutLinesUpdateDto, args.input);

  try {

    const checkoutId = await broker.call("checkout.updateCheckoutLines", {
      checkoutId: dto.checkoutId,
      lines: dto.lines.map((l) => ({
        lineId: l.lineId,
        quantity: l.quantity,
      })),
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
      "checkoutLinesUpdate domain error"
    );
    throw await fromDomainError(err);
  }
};
