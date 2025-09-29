import { UseCase } from "@src/application/usecases/useCase";
import type { CheckoutCustomerIdentityUpdateInput } from "@src/application/checkout/types";
import type { CheckoutCustomerIdentityUpdatedDto } from "@src/domain/checkout/events";

export class UpdateCustomerIdentityUseCase extends UseCase<
  CheckoutCustomerIdentityUpdateInput,
  string
> {
  async execute(input: CheckoutCustomerIdentityUpdateInput): Promise<string> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const state = await this.getCheckoutState(businessInput.checkoutId);

    this.assertCheckoutExists(state);
    this.validateTenantAccess(state, context);

    const event: CheckoutCustomerIdentityUpdatedDto = {
      type: "checkout.customer.identity.updated",
      data: {
        email: businessInput.email,
        customerId: businessInput.customerId,
        phone: businessInput.phone,
        countryCode: businessInput.countryCode,
      },
      metadata: this.createMetadataDto(businessInput.checkoutId, context),
    };

    await this.checkoutWriteRepository.updateCustomerIdentity(event);

    return businessInput.checkoutId;
  }
}
