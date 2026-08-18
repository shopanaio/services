import { App } from "@src/ioc/container";
import type { ApiMutationCheckoutDeliveryRecipientsUpdateArgs, ApiMutation } from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutDeliveryRecipientsUpdateDto } from "@src/application/dto/checkoutDeliveryRecipients.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
import { createValidated } from "@src/utils/validation";

export const checkoutDeliveryRecipientsUpdate = async (_parent: ApiMutation, args: ApiMutationCheckoutDeliveryRecipientsUpdateArgs, ctx: GraphQLContext) => {
  const { checkoutUsecase, logger } = App.getInstance();
  const dto = createValidated(CheckoutDeliveryRecipientsUpdateDto, args.input);
  try {
    const checkout = await checkoutUsecase.updateDeliveryGroupRecipient.execute({
      checkoutId: dto.checkoutId,
      updates: dto.updates,
      storefrontAccess: ctx.storefrontAccess,
      visitorId: ctx.visitorId,
      store: ctx.store,
      customer: ctx.customer,
      user: ctx.user,
    });
    return { checkout: mapCommittedCheckoutToApi(checkout), userErrors: [] };
  } catch (error) {
    logger.error({ reason: error instanceof Error ? error.message : String(error), checkoutId: dto.checkoutId }, "deliveryRecipientsUpdate error");
    throw await fromDomainError(error);
  }
};
