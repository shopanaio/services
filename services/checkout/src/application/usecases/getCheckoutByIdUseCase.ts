import { UseCase } from "@src/application/usecases/useCase";
import { Checkout } from "@src/domain/checkout/model";
import { CheckoutReadRepository } from "@src/application/read/checkoutReadRepository";

export interface GetCheckoutByIdInput {
  checkoutId: string;
}

export interface GetCheckoutByIdUseCaseDependencies {
  checkoutReadRepository: CheckoutReadRepository;
}

export class GetCheckoutByIdUseCase extends UseCase<
  GetCheckoutByIdInput,
  Checkout | null
> {
  constructor(deps: GetCheckoutByIdUseCaseDependencies, baseDeps?: any) {
    super(baseDeps);
    this.checkoutReadRepository = deps.checkoutReadRepository;
  }

  readonly checkoutReadRepository: CheckoutReadRepository;

  async execute(input: GetCheckoutByIdInput): Promise<Checkout | null> {
    const state = await this.checkoutReadRepository.findByIdAsCheckoutState(
      input.checkoutId
    );
    if (!state) return null;
    return Checkout.fromAggregate(input.checkoutId, state);
  }
}
