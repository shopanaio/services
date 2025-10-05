import { UseCase } from "@src/application/usecases/useCase";
import type { CheckoutPaymentMethodUpdateInput } from "@src/application/checkout/types";
import type { CheckoutPaymentMethodUpdatedDto } from "@src/domain/checkout/dto";

export class UpdatePaymentMethodUseCase extends UseCase<
  CheckoutPaymentMethodUpdateInput,
  CheckoutPaymentMethodUpdatedDto
> {
  async execute(
    input: CheckoutPaymentMethodUpdateInput
  ): Promise<CheckoutPaymentMethodUpdatedDto> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const state = await this.getCheckoutState(businessInput.checkoutId);

    this.assertCheckoutExists(state);
    this.validateTenantAccess(state, context);

    if (!state.payment || state.payment.methods.length === 0) {
      throw new Error("Checkout payment aggregate missing");
    }

    const availableMethod = state.payment.methods.find(
      (method) => method.code === businessInput.paymentMethodCode
    );

    if (!availableMethod) {
      throw new Error(
        `Payment method not available: ${businessInput.paymentMethodCode}`
      );
    }

    const resultDto: CheckoutPaymentMethodUpdatedDto = {
      data: {
        paymentMethod: {
          code: availableMethod.code,
          provider: availableMethod.provider,
          flow: availableMethod.flow,
          metadata: availableMethod.metadata ?? null,
          customerInput: businessInput.data ?? null,
        },
        payableAmount: state.payment.payableAmount,
      },
      metadata: this.createMetadataDto(businessInput.checkoutId, context),
    };

    // Save payment method and selected payment method to database
    await this.checkoutWriteRepository.updatePaymentMethod(resultDto);

    return resultDto;
  }
}
