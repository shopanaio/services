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
import { decodeCheckoutId } from "@src/interfaces/gql-storefront-api/idCodec";

/**
 * checkoutLanguageCodeUpdate(input: CheckoutLanguageCodeUpdateInput!): Checkout!
 */
export const checkoutLanguageCodeUpdate = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutLanguageCodeUpdateArgs,
  ctx: GraphQLContext
) => {
  const app = App.getInstance();
  const { checkoutUsecase, checkoutReadRepository, logger } = app;
  const dto = createValidated(CheckoutLanguageCodeUpdateInput, args.input);

  try {
    const checkoutId = decodeCheckoutId(dto.checkoutId);

    const updatedCheckoutId = await checkoutUsecase.updateLanguageCode.execute({
      checkoutId,
      localeCode: dto.localeCode,
      apiKey: ctx.apiKey,
      project: ctx.project,
      customer: ctx.customer,
      user: ctx.user,
    });
    const checkout = await checkoutReadRepository.findById(updatedCheckoutId);
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
