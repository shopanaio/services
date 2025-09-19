import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutationCheckoutLanguageCodeUpdateArgs,
  ApiCheckoutMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutLanguageCodeUpdateInput } from "@src/application/dto/checkoutLanguageCodeUpdate.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { createValidated } from "@src/utils/validation";

/**
 * checkoutLanguageCodeUpdate(input: CheckoutLanguageCodeUpdateInput!): Checkout!
 */
export const checkoutLanguageCodeUpdate = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutLanguageCodeUpdateArgs,
  ctx: GraphQLContext
) => {
  const { broker, logger } = App.getInstance();
  const dto = createValidated(CheckoutLanguageCodeUpdateInput, args.input);

  try {

    const checkoutId = await broker.call("checkout.updateLanguageCode", {
      checkoutId: dto.checkoutId,
      localeCode: dto.localeCode,
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
    logger.error({ reason, input: dto }, "languageCodeUpdate error");
    throw await fromDomainError(err);
  }
};
