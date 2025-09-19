import { UseCase } from "@src/application/usecases/useCase";
import type { ClearDeliveryGroupAddressCommand } from "@src/domain/checkout/commands";
import { checkoutDecider } from "@src/domain/checkout/decider";
import type { CheckoutDeliveryAddressRemoveInput } from "@src/application/checkout/types";

export class RemoveDeliveryAddressUseCase extends UseCase<
  CheckoutDeliveryAddressRemoveInput,
  string
> {
  async execute(input: CheckoutDeliveryAddressRemoveInput): Promise<string> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const { state, streamExists, streamVersion, streamId } =
      await this.loadCheckoutState(businessInput.checkoutId);

    this.validateCheckoutExists(streamExists);
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

    const command: ClearDeliveryGroupAddressCommand = {
      type: "checkout.delivery.group.address.clear",
      data: {
        addressId: businessInput.addressId,
        deliveryGroupId: groupToRemove.id,
      },
      metadata: this.createCommandMetadata(businessInput.checkoutId, context),
    };

    await this.appendToStream(
      streamId,
      checkoutDecider.decide(command, state),
      streamVersion
    );

    return businessInput.checkoutId;
  }
}
