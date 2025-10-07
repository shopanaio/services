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
  ctx: GraphQLContext,
) => {
  const app = App.getInstance();
  const { checkoutUsecase, checkoutReadRepository, logger } = app;
  const dto = createValidated(CheckoutDeliveryRecipientsUpdateDto, args.input);

  try {
    // Updating each recipient
    for (const updateItem of dto.updates) {
      // First, get the current state to find existing recipient ID
      const checkout = await checkoutReadRepository.findById(dto.checkoutId);
      if (!checkout) {
        throw new Error(`Checkout not found: ${dto.checkoutId}`);
      }

      const group = checkout.deliveryGroups.find(
        (g) => g.id === updateItem.deliveryGroupId
      );
      if (!group) {
        throw new Error(`Delivery group not found: ${updateItem.deliveryGroupId}`);
      }

      // Use existing recipient ID or create new one if not exists
      const recipientId = group.recipient ? group.recipient.firstName : null; // This is a placeholder, we need proper ID tracking

      await checkoutUsecase.updateDeliveryGroupRecipient.execute({
        checkoutId: dto.checkoutId,
        deliveryGroupId: updateItem.deliveryGroupId,
        recipient: {
          id: updateItem.deliveryGroupId, // Use deliveryGroupId as recipient ID for 1:1 relationship
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
