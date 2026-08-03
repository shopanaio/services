import { App } from "@src/ioc/container";
import type {
  ApiMutationCheckoutLanguageCodeUpdateArgs,
  ApiMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutLanguageCodeUpdateInput } from "@src/application/dto/checkoutLanguageCodeUpdate.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
import { createValidated } from "@src/utils/validation";
// Removed idCodec imports as validation/transformation now happens in DTO

/**
 * checkoutLanguageCodeUpdate(input: CheckoutLanguageCodeUpdateInput!): Checkout!
 */
export const checkoutLanguageCodeUpdate = async (
  _parent: ApiMutation,
  args: ApiMutationCheckoutLanguageCodeUpdateArgs,
  ctx: GraphQLContext
) => {
  const app = App.getInstance();
  const { checkoutUsecase, logger } = app;
  const dto = createValidated(CheckoutLanguageCodeUpdateInput, args.input);

  try {
    const checkout = await checkoutUsecase.updateLanguageCode.execute({
      checkoutId: dto.checkoutId, // Already decoded by validator dto.checkoutId, // Already decoded by validator
      localeCode: dto.localeCode,
      storefrontAccess: ctx.storefrontAccess,
      store: ctx.store,
      customer: ctx.customer,
      user: ctx.user,
    });
    return mapCommittedCheckoutToApi(checkout);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason, checkoutId: dto.checkoutId }, "languageCodeUpdate error");
    throw await fromDomainError(err);
  }
};
