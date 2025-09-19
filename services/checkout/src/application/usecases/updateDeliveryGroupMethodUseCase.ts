import { DeliveryMethodType } from "@shopana/shipping-plugin-kit";
import { UseCase } from "@src/application/usecases/useCase";
import type { UpdateDeliveryGroupMethodCommand } from "@src/domain/checkout/commands";
import { checkoutDecider } from "@src/domain/checkout/decider";
import type { CheckoutDeliveryMethodUpdateInput } from "@src/application/checkout/types";

export class UpdateDeliveryGroupMethodUseCase extends UseCase<
  CheckoutDeliveryMethodUpdateInput,
  void
> {
  async execute(input: CheckoutDeliveryMethodUpdateInput): Promise<void> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const { state, streamExists, streamVersion, streamId } =
      await this.loadCheckoutState(businessInput.checkoutId);

    this.validateCheckoutExists(streamExists);
    this.validateTenantAccess(state, context);

    const group = state.deliveryGroups?.find(
      (g) => g.id === businessInput.deliveryGroupId
    );
    if (!group) {
      throw new Error(`Delivery group not found: ${businessInput.deliveryGroupId}`);
    }

    const method = group.deliveryMethods.find(
      (m) => m.code === businessInput.deliveryMethodCode
    );
    if (!method) {
      throw new Error(
        `Delivery method code not available: ${businessInput.deliveryMethodCode}`
      );
    }

    const command: UpdateDeliveryGroupMethodCommand = {
      type: "checkout.delivery.group.method.update",
      data: {
        deliveryGroupId: businessInput.deliveryGroupId,
        deliveryMethod: {
          code: method.code,
          provider: method.provider.code,
          deliveryMethodType: method.deliveryMethodType,
          shippingPaymentModel: method.shippingPaymentModel,
          estimatedDeliveryDays: null, // Not available in current state structure
          shippingCost: null, // Will be calculated later if needed
        },
        shippingTotal: null, // Will be calculated by decider if needed
      },
      metadata: this.createCommandMetadata(businessInput.checkoutId, context),
    };

    const events = checkoutDecider.decide(command, state);
    if (Array.isArray(events) && events.length === 0) return;

    await this.appendToStream(streamId, events, streamVersion);
  }
}
