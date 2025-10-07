import { UseCase } from "@src/application/usecases/useCase";
import type { CheckoutDeliveryGroupRecipientUpdatedDto } from "@src/domain/checkout/dto";
import type { CheckoutDeliveryGroupRecipientUpdateInput } from "@src/application/checkout/types";

/**
 * Updates recipient for a delivery group
 */
export class UpdateDeliveryGroupRecipientUseCase extends UseCase<
  CheckoutDeliveryGroupRecipientUpdateInput,
  void
> {
  async execute(input: CheckoutDeliveryGroupRecipientUpdateInput): Promise<void> {
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

    const dto: CheckoutDeliveryGroupRecipientUpdatedDto = {
      data: {
        deliveryGroupId: businessInput.deliveryGroupId,
        recipient: businessInput.recipient,
      },
      metadata: this.createMetadataDto(businessInput.checkoutId, context),
    };

    await this.checkoutWriteRepository.updateDeliveryGroupRecipient(dto);
  }
}
