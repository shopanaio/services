import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutationCheckoutCurrencyCodeUpdateArgs,
  ApiCheckoutMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutCurrencyCodeUpdateInput } from "@src/application/dto/checkoutCurrencyCodeUpdate.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { createValidated } from "@src/utils/validation";

/**
 * checkoutCurrencyCodeUpdate(input: CheckoutCurrencyCodeUpdateInput!): Checkout!
 */
export const checkoutCurrencyCodeUpdate = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutCurrencyCodeUpdateArgs,
  ctx: GraphQLContext
) => {
  const { broker, logger } = App.getInstance();
  const dto = createValidated(CheckoutCurrencyCodeUpdateInput, args.input);

  try {

    const checkoutId = await broker.call("checkout.updateCurrencyCode", {
      checkoutId: dto.checkoutId,
      currencyCode: dto.currencyCode,
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

    return mapCheckoutReadToApi(checkout);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason, input: dto }, "currencyCodeUpdate error");
    throw await fromDomainError(err);
  }
};
