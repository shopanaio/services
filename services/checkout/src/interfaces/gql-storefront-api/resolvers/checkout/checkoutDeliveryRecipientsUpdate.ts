import { App } from "@src/ioc/container";
import type { ApiCheckoutMutationCheckoutDeliveryRecipientsUpdateArgs, ApiCheckoutMutation } from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutDeliveryRecipientsUpdateDto } from "@src/application/dto/checkoutDeliveryRecipients.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
import { createValidated } from "@src/utils/validation";

export const checkoutDeliveryRecipientsUpdate = async (_parent: ApiCheckoutMutation, args: ApiCheckoutMutationCheckoutDeliveryRecipientsUpdateArgs, ctx: GraphQLContext) => {
  const { checkoutUsecase, logger } = App.getInstance();
  const dto = createValidated(CheckoutDeliveryRecipientsUpdateDto, args.input);
  try {
    const checkout = await checkoutUsecase.updateDeliveryGroupRecipient.execute({
      checkoutId: dto.checkoutId,
      updates: dto.updates,
      storefrontAccess: ctx.storefrontAccess,
      store: ctx.store,
      customer: ctx.customer,
      user: ctx.user,
    });
    return mapCommittedCheckoutToApi(checkout);
  } catch (error) {
    logger.error({ reason: error instanceof Error ? error.message : String(error), checkoutId: dto.checkoutId }, "deliveryRecipientsUpdate error");
    throw await fromDomainError(error);
  }
};
