import { UseCase } from "@src/application/usecases/useCase";
import type { CheckoutCustomerNoteUpdateInput } from "@src/application/checkout/types";
import type { UpdateCustomerNoteCommand } from "@src/domain/checkout/commands";
import { checkoutDecider } from "@src/domain/checkout/decider";

export class UpdateCustomerNoteUseCase extends UseCase<
  CheckoutCustomerNoteUpdateInput,
  string
> {
  async execute(input: CheckoutCustomerNoteUpdateInput): Promise<string> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const { state, streamExists, streamVersion, streamId } =
      await this.loadCheckoutState(businessInput.checkoutId);

    this.validateCheckoutExists(streamExists);
    this.validateTenantAccess(state, context);

    const command: UpdateCustomerNoteCommand = {
      type: "checkout.customer.note.update",
      data: {
        note: businessInput.note ?? null,
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
