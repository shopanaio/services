import { UseCase } from "@src/application/usecases/useCase";
import type { CheckoutDto } from "@shopana/checkout-sdk";
import { Checkout } from "@src/domain/checkout/model";

export interface GetCheckoutDtoByIdInput {
  checkoutId: string;
}

export class GetCheckoutDtoByIdUseCase extends UseCase<
  GetCheckoutDtoByIdInput,
  CheckoutDto | null
> {
  constructor(baseDeps?: any) {
    super(baseDeps);
  }

  async execute(input: GetCheckoutDtoByIdInput): Promise<CheckoutDto | null> {
    const { state, streamExists } = await this.loadCheckoutState(input.checkoutId);
    if (!streamExists) return null;
    const aggregate = Checkout.fromAggregate(input.checkoutId, state);
    return aggregate.toJSON();
  }
}

