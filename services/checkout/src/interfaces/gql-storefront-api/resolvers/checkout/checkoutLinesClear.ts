import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutationCheckoutLinesClearArgs,
  ApiCheckoutMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutLinesClearDto } from "@src/application/dto/checkoutLinesClear.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { createValidated } from "@src/utils/validation";

/**
 * checkoutLinesClear(input: CheckoutLinesClearInput!): CheckoutLinesClearPayload!
 */
export const checkoutLinesClear = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutLinesClearArgs,
  ctx: GraphQLContext
) => {
  const { broker, logger } = App.getInstance();
  const dto = createValidated(CheckoutLinesClearDto, args.input);

  try {

    const checkoutId = await broker.call("checkout.clearCheckoutLines", {
      checkoutId: dto.checkoutId,
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
    logger.error({ reason, input: dto }, "checkoutLinesClear domain error");
    throw await fromDomainError(err);
  }
};
