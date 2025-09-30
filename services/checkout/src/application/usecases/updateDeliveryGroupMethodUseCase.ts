import { DeliveryMethodType } from "@shopana/plugin-sdk/shipping";
import { UseCase } from "@src/application/usecases/useCase";
import type { CheckoutDeliveryGroupMethodUpdatedDto } from "@src/domain/checkout/dto";
import type { CheckoutDeliveryMethodUpdateInput } from "@src/application/checkout/types";

export class UpdateDeliveryGroupMethodUseCase extends UseCase<
  CheckoutDeliveryMethodUpdateInput,
  void
> {
  async execute(input: CheckoutDeliveryMethodUpdateInput): Promise<void> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const state = await this.getCheckoutState(businessInput.checkoutId);

    this.assertCheckoutExists(state);
    this.validateTenantAccess(state, context);

    const group = state.deliveryGroups?.find(
      (g) => g.id === businessInput.deliveryGroupId
    );
    if (!group) {
      throw new Error(
        `Delivery group not found: ${businessInput.deliveryGroupId}`
      );
    }

    const method = group.deliveryMethods.find(
      (m) => m.code === businessInput.shippingMethodCode
    );
    if (!method) {
      throw new Error(
        `Delivery method code not available: ${businessInput.shippingMethodCode}`
      );
    }

    const dto: CheckoutDeliveryGroupMethodUpdatedDto = {
      data: {
        deliveryGroupId: businessInput.deliveryGroupId,
        deliveryMethod: {
          code: method.code,
          provider: method.provider.code,
          deliveryMethodType: method.deliveryMethodType,
          shippingPaymentModel: method.shippingPaymentModel,
          estimatedDeliveryDays: null,
          shippingCost: null,
        },
        shippingTotal: null,
      },
      metadata: this.createMetadataDto(businessInput.checkoutId, context),
    };

    await this.checkoutWriteRepository.updateDeliveryGroupMethod(dto);
  }
}
