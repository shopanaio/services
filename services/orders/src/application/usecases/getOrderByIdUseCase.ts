import { UseCase } from "@src/application/usecases/useCase";
import { Order } from "@src/domain/order/model";
import { OrderReadRepository } from "@src/application/read/orderReadRepository";

export interface GetOrderByIdInput {
  orderId: string;
  /**
   * Data source for getting order
   * - 'event_store' - data from event store (default)
   * - 'read_model' - data from read model (faster, but may not be the most current version)
   */
  dataSource?: 'event_store' | 'read_model';
}

export interface GetOrderByIdUseCaseDependencies {
  orderReadRepository: OrderReadRepository;
}

export class GetOrderByIdUseCase extends UseCase<GetOrderByIdInput, Order | null> {
  constructor(
    deps: GetOrderByIdUseCaseDependencies,
    baseDeps?: any
  ) {
    super(baseDeps);
    this.orderReadRepository = deps.orderReadRepository;
  }

  private readonly orderReadRepository: OrderReadRepository;

  async execute(input: GetOrderByIdInput): Promise<Order | null> {
    const dataSource = input.dataSource || 'event_store';

    if (dataSource === 'read_model') {
      // Get data from read model
      const state = await this.orderReadRepository.findByIdAsOrderState(input.orderId);
      if (!state) {
        return null;
      }
      return Order.fromAggregate(input.orderId, state);
    } else {
      // Get data from event store (default)
      const { state, streamExists } = await this.loadOrderState(input.orderId);

      if (!streamExists) {
        return null;
      }

      return Order.fromAggregate(input.orderId, state);
    }
  }
}
