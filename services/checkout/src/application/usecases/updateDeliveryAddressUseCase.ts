import { UseCase } from "@src/application/usecases/useCase";
import { UpdateDeliveryGroupAddressUseCase } from "./updateDeliveryGroupAddressUseCase";
import type { CheckoutDeliveryAddressUpdateInput } from "@src/application/checkout/types";

export class UpdateDeliveryAddressUseCase extends UseCase<CheckoutDeliveryAddressUpdateInput, void> {
  private updateDeliveryGroupAddressUseCase: UpdateDeliveryGroupAddressUseCase;

  constructor(deps: any) {
    super(deps);
    this.updateDeliveryGroupAddressUseCase = new UpdateDeliveryGroupAddressUseCase(deps);
  }

  async execute(input: CheckoutDeliveryAddressUpdateInput): Promise<void> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const { state, streamExists } = await this.loadCheckoutState(businessInput.checkoutId);

    this.validateCheckoutExists(streamExists);
    this.validateTenantAccess(state, context);

    // Find delivery group with matching address ID
    const deliveryGroups = state.deliveryGroups || [];
    const deliveryGroup = deliveryGroups.find(
      (g) => g.deliveryAddress && g.deliveryAddress.id === businessInput.addressId
    );

    if (deliveryGroup) {
      await this.updateDeliveryGroupAddressUseCase.execute({
        ...context,
        checkoutId: businessInput.checkoutId,
        deliveryGroupId: deliveryGroup.id,
        address: {
          id: businessInput.addressId, // Pass existing address ID
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
        },
      });
    } else {
      throw new Error(`Delivery address with ID ${businessInput.addressId} not found`);
    }
  }
}
