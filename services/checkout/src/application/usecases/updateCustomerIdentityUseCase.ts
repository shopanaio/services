import { UseCase } from "@src/application/usecases/useCase";
import type { CheckoutCustomerIdentityUpdateInput } from "@src/application/checkout/types";
import type { UpdateCustomerIdentityCommand } from "@src/domain/checkout/commands";
import { checkoutDecider } from "@src/domain/checkout/decider";

export class UpdateCustomerIdentityUseCase extends UseCase<
  CheckoutCustomerIdentityUpdateInput,
  string
> {
  async execute(input: CheckoutCustomerIdentityUpdateInput): Promise<string> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const { state, streamExists, streamVersion, streamId } =
      await this.loadCheckoutState(businessInput.checkoutId);

    this.validateCheckoutExists(streamExists);
    this.validateTenantAccess(state, context);

    const command: UpdateCustomerIdentityCommand = {
      type: "checkout.customer.identity.update",
      data: {
        email: businessInput.email,
        customerId: businessInput.customerId,
        phone: businessInput.phone,
        countryCode: businessInput.countryCode,
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
