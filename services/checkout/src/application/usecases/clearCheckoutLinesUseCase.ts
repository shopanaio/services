import { UseCase } from "@src/application/usecases/useCase";
import type { CheckoutLinesClearInput } from "@src/application/checkout/types";
import type { CheckoutLinesClearedDto } from "@src/domain/checkout/dto";
import { Money } from "@shopana/shared-money";

export class ClearCheckoutLinesUseCase extends UseCase<
  CheckoutLinesClearInput,
  string
> {
  async execute(input: CheckoutLinesClearInput): Promise<string> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const state = await this.getCheckoutState(businessInput.checkoutId);

    this.assertCheckoutExists(state);
    this.validateTenantAccess(state, context);
    this.validateCurrencyCode(state);

    const dto: CheckoutLinesClearedDto = {
      data: {
        checkoutLines: [],
        checkoutLinesCost: {},
        checkoutCost: {
          subtotal: Money.zero(),
          discountTotal: Money.zero(),
          taxTotal: Money.zero(),
          shippingTotal: Money.zero(),
          grandTotal: Money.zero(),
          totalQuantity: 0,
        },
      },
      metadata: this.createMetadataDto(businessInput.checkoutId, context),
    };

    await this.checkoutWriteRepository.clearCheckoutLines(dto);

    return businessInput.checkoutId;
  }
}
