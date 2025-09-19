import { UseCase } from "@src/application/usecases/useCase";
import { Checkout } from "@src/domain/checkout/model";
import { CheckoutReadRepository } from "@src/application/read/checkoutReadRepository";

export interface GetCheckoutByIdInput {
  checkoutId: string;
  /**
   * Data source for getting checkout
   * - 'event_store' - data from event store (default)
   * - 'read_model' - data from read model (faster, but may not be the most current version)
   */
  dataSource?: 'event_store' | 'read_model';
}

export interface GetCheckoutByIdUseCaseDependencies {
  checkoutReadRepository: CheckoutReadRepository;
}

export class GetCheckoutByIdUseCase extends UseCase<GetCheckoutByIdInput, Checkout | null> {
  constructor(
    deps: GetCheckoutByIdUseCaseDependencies,
    baseDeps?: any
  ) {
    super(baseDeps);
    this.checkoutReadRepository = deps.checkoutReadRepository;
  }

  private readonly checkoutReadRepository: CheckoutReadRepository;

  async execute(input: GetCheckoutByIdInput): Promise<Checkout | null> {
    const dataSource = input.dataSource || 'event_store';

    if (dataSource === 'read_model') {
      // Get data from read model
      const state = await this.checkoutReadRepository.findByIdAsCheckoutState(input.checkoutId);
      if (!state) {
        return null;
      }
      return Checkout.fromAggregate(input.checkoutId, state);
    } else {
      // Get data from event store (default)
      const { state, streamExists } = await this.loadCheckoutState(input.checkoutId);

      if (!streamExists) {
        return null;
      }

      return Checkout.fromAggregate(input.checkoutId, state);
    }
  }
}
