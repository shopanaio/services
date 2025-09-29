import { UseCase } from "@src/application/usecases/useCase";
import type { CheckoutDeliveryGroupAddressUpdatedDto } from "@src/domain/checkout/events";
import type { CheckoutDeliveryGroupAddressUpdateInput } from "@src/application/checkout/types";

export class UpdateDeliveryGroupAddressUseCase extends UseCase<
  CheckoutDeliveryGroupAddressUpdateInput,
  void
> {
  async execute(input: CheckoutDeliveryGroupAddressUpdateInput): Promise<void> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const state = await this.getCheckoutState(businessInput.checkoutId);

    this.assertCheckoutExists(state);
    this.validateTenantAccess(state, context);

    const event: CheckoutDeliveryGroupAddressUpdatedDto = {
      type: "checkout.delivery.group.address.updated",
      data: {
        deliveryGroupId: businessInput.deliveryGroupId,
        address: businessInput.address,
      },
      metadata: this.createMetadataDto(businessInput.checkoutId, context),
    };

    await this.checkoutWriteRepository.updateDeliveryGroupAddress(event);
  }
}
