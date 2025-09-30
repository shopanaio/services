import type { EventStorePort } from "@src/application/ports/eventStorePort";
import type { StreamNamePolicyPort } from "@src/application/ports/streamNamePort";
import type { Logger } from "pino";
import type { ShippingApiClient, PricingApiClient, InventoryApiClient, CheckoutApiClient } from "@shopana/shared-service-api";

// Import use cases
import {
  CreateOrderUseCase,
  GetOrderByIdUseCase,
} from "@src/application/usecases";
import { OrderService } from "@src/application/services/orderService";
import { OrderReadRepository } from "@src/application/read/orderReadRepository";
import { OrdersPiiRepository } from "@src/infrastructure/pii/ordersPiiRepository";
import type { IdempotencyRepository } from "@src/infrastructure/idempotency/idempotencyRepository";

export class OrderUsecase {
  // Order use cases
  public readonly createOrder: CreateOrderUseCase;
  public readonly getOrderById: GetOrderByIdUseCase;

  constructor(deps: {
    eventStore: EventStorePort;
    streamNames: StreamNamePolicyPort;
    logger?: Logger;
    inventory: InventoryApiClient;
    shippingApiClient: ShippingApiClient;
    pricingApiClient: PricingApiClient;
    checkoutApiClient: CheckoutApiClient;
    orderService: OrderService;
    orderReadRepository: OrderReadRepository;
    ordersPiiRepository: OrdersPiiRepository;
    idempotencyRepository: IdempotencyRepository;
  }) {
    const baseDeps = {
      eventStore: deps.eventStore,
      streamNames: deps.streamNames,
      logger: deps.logger,
      inventory: deps.inventory,
      shippingApiClient: deps.shippingApiClient,
      pricingApiClient: deps.pricingApiClient,
      checkoutApiClient: deps.checkoutApiClient,
      orderService: deps.orderService,
      ordersPiiRepository: deps.ordersPiiRepository,
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
