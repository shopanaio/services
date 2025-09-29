import { UseCase } from "@src/application/usecases/useCase";
import type { CheckoutCustomerNoteUpdateInput } from "@src/application/checkout/types";
import type { CheckoutCustomerNoteUpdatedDto } from "@src/domain/checkout/events";

export class UpdateCustomerNoteUseCase extends UseCase<
  CheckoutCustomerNoteUpdateInput,
  string
> {
  async execute(input: CheckoutCustomerNoteUpdateInput): Promise<string> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const state = await this.getCheckoutState(businessInput.checkoutId);

    this.assertCheckoutExists(state);
    this.validateTenantAccess(state, context);

    const event: CheckoutCustomerNoteUpdatedDto = {
      type: "checkout.customer.note.updated",
      data: {
        note: businessInput.note ?? null,
      },
      metadata: this.createMetadataDto(businessInput.checkoutId, context),
    };

    await this.checkoutWriteRepository.updateCustomerNote(event);

    return businessInput.checkoutId;
  }
}
