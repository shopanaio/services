import { App } from "@src/ioc/container";
import type {
  ApiMutationCheckoutDeliveryRecipientsRemoveArgs,
  ApiMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutDeliveryRecipientsRemoveDto } from "@src/application/dto/checkoutDeliveryRecipients.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
import { createValidated } from "@src/utils/validation";

export const checkoutDeliveryRecipientsRemove = async (
  _parent: ApiMutation,
  args: ApiMutationCheckoutDeliveryRecipientsRemoveArgs,
  ctx: GraphQLContext,
) => {
  const { checkoutUsecase, logger } = App.getInstance();
  const dto = createValidated(CheckoutDeliveryRecipientsRemoveDto, args.input);
  try {
    const checkout = await checkoutUsecase.removeDeliveryGroupRecipient.execute({
      checkoutId: dto.checkoutId,
      deliveryGroupIds: dto.deliveryGroupIds,
      storefrontAccess: ctx.storefrontAccess,
      visitorId: ctx.visitorId,
      store: ctx.store,
      customer: ctx.customer,
      user: ctx.user,
    });
    return { checkout: mapCommittedCheckoutToApi(checkout), userErrors: [] };
  } catch (error) {
    logger.error(
      {
        reason: error instanceof Error ? error.message : String(error),
        checkoutId: dto.checkoutId,
      },
      "deliveryRecipientsRemove error",
    );
    throw await fromDomainError(error);
  }
};
