import { UseCase } from "@src/application/usecases/useCase";
import type { CheckoutDeliveryGroupAddressClearedDto } from "@src/domain/checkout/dto";
import type { CheckoutDeliveryAddressRemoveInput } from "@src/application/checkout/types";

export class RemoveDeliveryAddressUseCase extends UseCase<
  CheckoutDeliveryAddressRemoveInput,
  string
> {
  async execute(input: CheckoutDeliveryAddressRemoveInput): Promise<string> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const state = await this.getCheckoutState(businessInput.checkoutId);

    this.assertCheckoutExists(state);
    this.validateTenantAccess(state, context);

    const deliveryGroups = state.deliveryGroups || [];
    const groupToRemove = deliveryGroups.find(
      (g) => g.deliveryAddress && g.deliveryAddress.id === businessInput.addressId
    );

    if (!groupToRemove) {
      throw new Error(
        `Delivery group with address ID ${businessInput.addressId} not found`
      );
    }

    const dto: CheckoutDeliveryGroupAddressClearedDto = {
      data: {
        addressId: businessInput.addressId,
        deliveryGroupId: groupToRemove.id,
      },
      metadata: this.createMetadataDto(businessInput.checkoutId, context),
    };

    await this.checkoutWriteRepository.clearDeliveryGroupAddress(dto);

    return businessInput.checkoutId;
  }
}
