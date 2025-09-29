import { UseCase } from "@src/application/usecases/useCase";
import type { CheckoutLanguageCodeUpdateInput } from "@src/application/checkout/types";
import type { CheckoutLanguageCodeUpdatedDto } from "@src/domain/checkout/dto";

export class UpdateLanguageCodeUseCase extends UseCase<
  CheckoutLanguageCodeUpdateInput,
  string
> {
  async execute(input: CheckoutLanguageCodeUpdateInput): Promise<string> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const state = await this.getCheckoutState(businessInput.checkoutId);

    this.assertCheckoutExists(state);
    this.validateTenantAccess(state, context);

    const dto: CheckoutLanguageCodeUpdatedDto = {
      data: {
        localeCode: businessInput.localeCode,
      },
      metadata: this.createMetadataDto(businessInput.checkoutId, context),
    };

    await this.checkoutWriteRepository.updateLanguageCode(dto);
    return businessInput.checkoutId;
  }
}
