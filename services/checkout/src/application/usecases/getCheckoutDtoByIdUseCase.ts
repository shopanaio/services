import { UseCase } from "@src/application/usecases/useCase";
import type { CheckoutDto } from "@shopana/checkout-sdk";
import { Checkout } from "@src/domain/checkout/model";

export interface GetCheckoutDtoByIdInput {
  checkoutId: string;
  projectId: string;
}

export class GetCheckoutDtoByIdUseCase extends UseCase<
  GetCheckoutDtoByIdInput,
  CheckoutDto | null
> {
  constructor(baseDeps?: any) {
    super(baseDeps);
  }

  async execute(input: GetCheckoutDtoByIdInput): Promise<CheckoutDto | null> {
    const state = await this.getCheckoutState(input.checkoutId);
    if (!state) return null;
    if (state.projectId !== input.projectId) {
      throw new Error("ProjectId mismatch for checkout");
    }
    return Checkout.fromAggregate(input.checkoutId, state).toJSON();
  }
}
