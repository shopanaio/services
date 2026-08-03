import type { Logger } from "pino";

import { CreateOrderUseCase } from "@src/application/usecases/orderCreate";
import { GetOrderByIdUseCase } from "@src/application/usecases/orderGetById";
import { OrderReadRepository } from "@src/application/read/orderReadRepository";
import type { Repository } from "@src/repositories/Repository";

export class OrderUsecase {
  // Order use cases
  public readonly createOrder: CreateOrderUseCase;
  public readonly getOrderById: GetOrderByIdUseCase;

  constructor(deps: {
    logger?: Logger;
    orderReadRepository: OrderReadRepository;
    repository: Repository;
  }) {
    const baseDeps = {
      logger: deps.logger,
    };

    // Initialize order use cases
    this.createOrder = new CreateOrderUseCase({
      ...baseDeps,
      repository: deps.repository,
    });

    this.getOrderById = new GetOrderByIdUseCase({
      ...baseDeps,
      orderReadRepository: deps.orderReadRepository,
    });
  }
}
