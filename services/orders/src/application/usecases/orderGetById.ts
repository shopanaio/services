import { UseCase, type UseCaseDependencies } from "@src/application/usecases/useCase";
import { Order } from "@src/domain/order/model";
import { OrderReadRepository } from "@src/application/read/orderReadRepository";

export interface GetOrderByIdInput {
  orderId: string;
}

export interface GetOrderByIdUseCaseDependencies extends UseCaseDependencies {
  orderReadRepository: OrderReadRepository;
}

export class GetOrderByIdUseCase extends UseCase<GetOrderByIdInput, Order | null> {
  constructor(deps: GetOrderByIdUseCaseDependencies) {
    super(deps);
    this.orderReadRepository = deps.orderReadRepository;
  }

  private readonly orderReadRepository: OrderReadRepository;

  async execute(input: GetOrderByIdInput): Promise<Order | null> {
    const read = await this.orderReadRepository.findById(input.orderId);
    return read ? Order.fromRecord(read) : null;
  }
}
