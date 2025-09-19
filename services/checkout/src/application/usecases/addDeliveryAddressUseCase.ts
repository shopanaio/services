import { UseCase } from "@src/application/usecases/useCase";
import { UpdateDeliveryGroupAddressUseCase } from "./updateDeliveryGroupAddressUseCase";
import { v7 as uuidv7 } from "uuid";
import type { CheckoutDeliveryAddressAddInput } from "@src/application/checkout/types";

export class AddDeliveryAddressUseCase extends UseCase<
  CheckoutDeliveryAddressAddInput,
  void
> {
  private updateDeliveryGroupAddressUseCase: UpdateDeliveryGroupAddressUseCase;

  constructor(deps: any) {
    super(deps);
    this.updateDeliveryGroupAddressUseCase =
      new UpdateDeliveryGroupAddressUseCase(deps);
  }

  async execute(input: CheckoutDeliveryAddressAddInput): Promise<void> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const { state, streamExists } = await this.loadCheckoutState(
      businessInput.checkoutId
    );

    this.validateCheckoutExists(streamExists);
    this.validateTenantAccess(state, context);
    this.validateCurrencyCode(state);

    const updatedAddress = {
      id: uuidv7(),
      address1: businessInput.address1,
      address2: businessInput.address2,
      city: businessInput.city,
      countryCode: businessInput.countryCode,
      provinceCode: businessInput.provinceCode,
      postalCode: businessInput.postalCode,
      email: businessInput.email,
      firstName: businessInput.firstName,
      lastName: businessInput.lastName,
      phone: businessInput.phone || null,
      data: businessInput.data,
    };

    // Find delivery group without address. DO NOT overwrite existing addresses.
    const deliveryGroups = state.deliveryGroups || [];
    const emptyGroup = deliveryGroups.find((g) => !g.deliveryAddress);

    if (emptyGroup) {
      // Update empty group with new address
      await this.updateDeliveryGroupAddressUseCase.execute({
        ...context,
        checkoutId: businessInput.checkoutId,
        deliveryGroupId: emptyGroup.id,
        address: updatedAddress,
      });
      return;
    }

    // Suitable group not found
    if (deliveryGroups.length === 0) {
      return;
    }
  }
}
