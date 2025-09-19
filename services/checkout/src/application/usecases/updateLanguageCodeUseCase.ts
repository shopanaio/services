import { UseCase } from "@src/application/usecases/useCase";
import type { CheckoutLanguageCodeUpdateInput } from "@src/application/checkout/types";
import type { UpdateLanguageCodeCommand } from "@src/domain/checkout/commands";
import { checkoutDecider } from "@src/domain/checkout/decider";

export class UpdateLanguageCodeUseCase extends UseCase<
  CheckoutLanguageCodeUpdateInput,
  string
> {
  async execute(input: CheckoutLanguageCodeUpdateInput): Promise<string> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const { state, streamExists, streamVersion, streamId } =
      await this.loadCheckoutState(businessInput.checkoutId);

    this.validateCheckoutExists(streamExists);
    this.validateTenantAccess(state, context);

    const command: UpdateLanguageCodeCommand = {
      type: "checkout.language.code.update",
      data: {
        localeCode: businessInput.localeCode,
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
