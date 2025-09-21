import type { EventStorePort } from "@src/application/ports/eventStorePort";
import type { StreamNamePolicyPort } from "@src/application/ports/streamNamePort";
import type { Logger } from "pino";
import type { ShippingApiClient } from "@shopana/shipping-api";
import type { PricingApiClient } from "@shopana/pricing-api";

// Import use cases
import {
  CreateOrderUseCase,
  GetOrderByIdUseCase,
} from "@src/application/usecases";
import { OrderService } from "@src/application/services/orderService";
import { OrderReadRepository } from "@src/application/read/orderReadRepository";
import { InventoryApiClient } from "@shopana/inventory-api";
import type { CheckoutApiClient } from "@shopana/checkout-api";
import { OrdersPiiRepository } from "@src/infrastructure/pii/ordersPiiRepository";

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
