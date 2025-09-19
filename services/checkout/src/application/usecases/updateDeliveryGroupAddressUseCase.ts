import { UseCase } from "@src/application/usecases/useCase";
import type { UpdateDeliveryGroupAddressCommand } from "@src/domain/checkout/commands";
import { checkoutDecider } from "@src/domain/checkout/decider";
import type { CheckoutDeliveryGroupAddressUpdateInput } from "@src/application/checkout/types";

export class UpdateDeliveryGroupAddressUseCase extends UseCase<
  CheckoutDeliveryGroupAddressUpdateInput,
  void
> {
  async execute(input: CheckoutDeliveryGroupAddressUpdateInput): Promise<void> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const { state, streamExists, streamVersion, streamId } =
      await this.loadCheckoutState(businessInput.checkoutId);

    this.validateCheckoutExists(streamExists);
    this.validateTenantAccess(state, context);

    const command: UpdateDeliveryGroupAddressCommand = {
      type: "checkout.delivery.group.address.update",
      data: {
        deliveryGroupId: businessInput.deliveryGroupId,
        address: businessInput.address,
      },
      metadata: this.createCommandMetadata(businessInput.checkoutId, context),
    };

    const events = checkoutDecider.decide(command, state);
    if (Array.isArray(events) && events.length === 0) {
      return;
    }

    await this.appendToStream(streamId, events, streamVersion);
  }
}
