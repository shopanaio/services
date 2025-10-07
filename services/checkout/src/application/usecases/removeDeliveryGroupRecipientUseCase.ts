import { UseCase } from "@src/application/usecases/useCase";
import type { CheckoutDeliveryGroupRecipientClearedDto } from "@src/domain/checkout/dto";
import type { CheckoutDeliveryGroupRecipientRemoveInput } from "@src/application/checkout/types";

/**
 * Removes recipient from a delivery group
 */
export class RemoveDeliveryGroupRecipientUseCase extends UseCase<
  CheckoutDeliveryGroupRecipientRemoveInput,
  string
> {
  async execute(input: CheckoutDeliveryGroupRecipientRemoveInput): Promise<string> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const state = await this.getCheckoutState(businessInput.checkoutId);

    this.assertCheckoutExists(state);
    this.validateTenantAccess(state, context);

    // Verify delivery group exists
    const group = state.deliveryGroups?.find(
      (g) => g.id === businessInput.deliveryGroupId
    );
    if (!group) {
      throw new Error(
        `Delivery group not found: ${businessInput.deliveryGroupId}`
      );
    }

    const dto: CheckoutDeliveryGroupRecipientClearedDto = {
      data: {
        deliveryGroupId: businessInput.deliveryGroupId,
      },
      metadata: this.createMetadataDto(businessInput.checkoutId, context),
    };

    await this.checkoutWriteRepository.clearDeliveryGroupRecipient(dto);

    return businessInput.checkoutId;
  }
}
