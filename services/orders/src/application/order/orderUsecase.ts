import type { EventStorePort } from "@src/application/ports/eventStorePort";
import type { StreamNamePolicyPort } from "@src/application/ports/streamNamePort";
import type { Logger } from "pino";

import { CreateOrderUseCase } from "@src/application/usecases/orderCreate";
import { GetOrderByIdUseCase } from "@src/application/usecases/orderGetById";
import { OrderReadRepository } from "@src/application/read/orderReadRepository";
import type { IdempotencyRepository } from "@src/infrastructure/idempotency/idempotencyRepository";

export class OrderUsecase {
  // Order use cases
  public readonly createOrder: CreateOrderUseCase;
  public readonly getOrderById: GetOrderByIdUseCase;

  constructor(deps: {
    eventStore: EventStorePort;
    streamNames: StreamNamePolicyPort;
    logger?: Logger;
    orderReadRepository: OrderReadRepository;
    idempotencyRepository: IdempotencyRepository;
  }) {
    const baseDeps = {
      eventStore: deps.eventStore,
      streamNames: deps.streamNames,
      logger: deps.logger,
      idempotencyRepository: deps.idempotencyRepository,
    };

    // Initialize order use cases
    this.createOrder = new CreateOrderUseCase({
      ...baseDeps,
    });

    this.getOrderById = new GetOrderByIdUseCase(
      {
        orderReadRepository: deps.orderReadRepository,
      },
      baseDeps
    );
  }
}
