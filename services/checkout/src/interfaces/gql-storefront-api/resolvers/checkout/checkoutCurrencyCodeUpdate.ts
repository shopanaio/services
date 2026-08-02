import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutationCheckoutCurrencyCodeUpdateArgs,
  ApiCheckoutMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutCurrencyCodeUpdateInput } from "@src/application/dto/checkoutCurrencyCodeUpdate.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
import { createValidated } from "@src/utils/validation";
// Removed idCodec imports as validation/transformation now happens in DTO

/**
 * checkoutCurrencyCodeUpdate(input: CheckoutCurrencyCodeUpdateInput!): Checkout!
 */
export const checkoutCurrencyCodeUpdate = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutCurrencyCodeUpdateArgs,
  ctx: GraphQLContext
) => {
  const app = App.getInstance();
  const { checkoutUsecase, logger } = app;
  const dto = createValidated(CheckoutCurrencyCodeUpdateInput, args.input);

  try {
    const checkout = await checkoutUsecase.updateCurrencyCode.execute({
      checkoutId: dto.checkoutId, // Already decoded by validator dto.checkoutId, // Already decoded by validator
      currencyCode: dto.currencyCode,
      storefrontAccess: ctx.storefrontAccess,
      store: ctx.store,
      customer: ctx.customer,
      user: ctx.user,
    });
    return mapCommittedCheckoutToApi(checkout);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason, checkoutId: dto.checkoutId }, "currencyCodeUpdate error");
    throw await fromDomainError(err);
  }
};
