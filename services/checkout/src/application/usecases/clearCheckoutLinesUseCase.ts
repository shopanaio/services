import { UseCase } from "@src/application/usecases/useCase";
import type { CheckoutLinesClearInput } from "@src/application/checkout/types";
import type { ClearCheckoutLinesCommand } from "@src/domain/checkout/commands";
import { Money } from "@shopana/money";
import { checkoutDecider } from "@src/domain/checkout/decider";

export class ClearCheckoutLinesUseCase extends UseCase<
  CheckoutLinesClearInput,
  string
> {
  async execute(input: CheckoutLinesClearInput): Promise<string> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const { state, streamExists, streamVersion, streamId } =
      await this.loadCheckoutState(businessInput.checkoutId);

    this.validateCheckoutExists(streamExists);
    this.validateTenantAccess(state, context);
    this.validateCurrencyCode(state);

    const command: ClearCheckoutLinesCommand = {
      type: "checkout.lines.clear",
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
      metadata: this.createCommandMetadata(businessInput.checkoutId, context),
    };

    const events = checkoutDecider.decide(command, state);
    await this.appendToStream(streamId, events, streamVersion!);

    return businessInput.checkoutId;
  }
}
