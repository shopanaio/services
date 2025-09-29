import { UseCase } from "@src/application/usecases/useCase";
import type { CheckoutCurrencyCodeUpdateInput } from "@src/application/checkout/types";
import type { CheckoutCurrencyCodeUpdatedDto } from "@src/domain/checkout/dto";
import { vo } from "@src/domain/shared/valueObjects";

export class UpdateCurrencyCodeUseCase extends UseCase<
  CheckoutCurrencyCodeUpdateInput,
  string
> {
  async execute(input: CheckoutCurrencyCodeUpdateInput): Promise<string> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const state = await this.getCheckoutState(businessInput.checkoutId);
    this.assertCheckoutExists(state);
    this.validateTenantAccess(state, context);

    // Validate currency code using domain validators
    try {
      vo.normalizeCurrencyCode(businessInput.currencyCode);
    } catch (error) {
      throw new Error(`Invalid currency code: ${businessInput.currencyCode}`);
    }

    const dto: CheckoutCurrencyCodeUpdatedDto = {
      data: {
        currencyCode: businessInput.currencyCode,
      },
      metadata: this.createMetadataDto(businessInput.checkoutId, context),
    };

    await this.checkoutWriteRepository.updateCurrencyCode(dto);

    return businessInput.checkoutId;
  }
}
