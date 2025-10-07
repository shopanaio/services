import { App } from "@src/ioc/container";
import type {
  ApiCheckoutMutationCheckoutDeliveryRecipientsUpdateArgs,
  ApiCheckoutMutation,
} from "@src/interfaces/gql-storefront-api/types";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { CheckoutDeliveryRecipientsUpdateDto } from "@src/application/dto/checkoutDeliveryRecipients.dto";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { createValidated } from "@src/utils/validation";

/**
 * checkoutDeliveryRecipientsUpdate(input: CheckoutDeliveryRecipientsUpdateInput!): Checkout!
 */
export const checkoutDeliveryRecipientsUpdate = async (
  _parent: ApiCheckoutMutation,
  args: ApiCheckoutMutationCheckoutDeliveryRecipientsUpdateArgs,
  ctx: GraphQLContext
) => {
  const app = App.getInstance();
  const { checkoutUsecase, checkoutReadRepository, logger } = app;
  const dto = createValidated(CheckoutDeliveryRecipientsUpdateDto, args.input);

  try {
    for (const updateItem of dto.updates) {
      await checkoutUsecase.updateDeliveryGroupRecipient.execute({
        checkoutId: dto.checkoutId,
        deliveryGroupId: updateItem.deliveryGroupId,
        recipient: {
          firstName: updateItem.recipient.firstName,
          lastName: updateItem.recipient.lastName,
          middleName: updateItem.recipient.middleName,
          email: updateItem.recipient.email,
          phone: updateItem.recipient.phone,
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
    logger.error({ reason, input: dto }, "deliveryRecipientsUpdate error");
    throw await fromDomainError(err);
  }
};
