import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutationCheckoutDeliveryRecipientsAddArgs,
  ApiCheckoutMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutDeliveryRecipientsAddDto } from "@src/application/dto/checkoutDeliveryRecipients.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { createValidated } from "@src/utils/validation";
/**
 * checkoutDeliveryRecipientsAdd(input: CheckoutDeliveryRecipientsAddInput!): Checkout!
 */
export const checkoutDeliveryRecipientsAdd = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutDeliveryRecipientsAddArgs,
  ctx: GraphQLContext
) => {
  const app = App.getInstance();
  const { checkoutUsecase, checkoutReadRepository, logger } = app;
  const dto = createValidated(CheckoutDeliveryRecipientsAddDto, args.input);

  try {
    // Adding recipients to delivery groups
    for (const recipientInput of dto.recipients) {
      await checkoutUsecase.updateDeliveryGroupRecipient.execute({
        checkoutId: dto.checkoutId,
        deliveryGroupId: recipientInput.deliveryGroupId,
        recipient: {
          firstName: recipientInput.recipient.firstName,
          lastName: recipientInput.recipient.lastName,
          middleName: recipientInput.recipient.middleName,
          email: recipientInput.recipient.email,
          phone: recipientInput.recipient.phone,
        },
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
    logger.error({ reason, input: dto }, "deliveryRecipientsAdd error");
    throw await fromDomainError(err);
  }
};
