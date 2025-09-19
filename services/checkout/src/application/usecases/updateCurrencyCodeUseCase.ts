import { UseCase } from "@src/application/usecases/useCase";
import type { CheckoutCurrencyCodeUpdateInput } from "@src/application/checkout/types";
import type { UpdateCurrencyCodeCommand } from "@src/domain/checkout/commands";
import { checkoutDecider } from "@src/domain/checkout/decider";
import { vo } from "@src/domain/shared/valueObjects";

export class UpdateCurrencyCodeUseCase extends UseCase<
  CheckoutCurrencyCodeUpdateInput,
  string
> {
  async execute(input: CheckoutCurrencyCodeUpdateInput): Promise<string> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const { state, streamExists, streamVersion, streamId } =
      await this.loadCheckoutState(businessInput.checkoutId);

    this.validateCheckoutExists(streamExists);
    this.validateTenantAccess(state, context);

    // Validate currency code using domain validators
    try {
      vo.normalizeCurrencyCode(businessInput.currencyCode);
    } catch (error) {
      throw new Error(`Invalid currency code: ${businessInput.currencyCode}`);
    }

    const command: UpdateCurrencyCodeCommand = {
      type: "checkout.currency.code.update",
      data: {
        currencyCode: businessInput.currencyCode,
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
