import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutationCheckoutDeliveryRecipientsRemoveArgs,
  ApiCheckoutMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutDeliveryRecipientsRemoveDto } from "@src/application/dto/checkoutDeliveryRecipients.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { createValidated } from "@src/utils/validation";

/**
 * checkoutDeliveryRecipientsRemove(input: CheckoutDeliveryRecipientsRemoveInput!): Checkout!
 */
export const checkoutDeliveryRecipientsRemove = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutDeliveryRecipientsRemoveArgs,
  ctx: GraphQLContext
) => {
  const app = App.getInstance();
  const { checkoutUsecase, checkoutReadRepository, logger } = app;
  const dto = createValidated(CheckoutDeliveryRecipientsRemoveDto, args.input);

  try {
    // Removing recipients from delivery groups
    for (const deliveryGroupId of dto.deliveryGroupIds) {
      await checkoutUsecase.removeDeliveryGroupRecipient.execute({
        checkoutId: dto.checkoutId,
        deliveryGroupId: deliveryGroupId,
        apiKey: ctx.apiKey,
        project: ctx.project,
        customer: ctx.customer,
        user: ctx.user,
      });
    }

    const checkout = await checkoutReadRepository.findById(dto.checkoutId);
    if (!checkout) {
      return null;
    }

    return mapCheckoutReadToApi(checkout);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ reason, input: dto }, "deliveryRecipientsRemove error");
    throw await fromDomainError(err);
  }
};
