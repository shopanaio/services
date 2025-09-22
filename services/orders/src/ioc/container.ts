import { OrderUsecase } from "@src/application/order/orderUsecase";
import { IdempotencyRepository } from "@src/infrastructure/idempotency/idempotencyRepository";
import { dumboPool } from "@src/infrastructure/db/dumbo";
import { createLogger } from "@src/infrastructure/logger/pino";
import type { EventStorePort } from "@src/application/ports/eventStorePort";
import { EmmetPostgresqlEventStoreAdapter } from "@src/infrastructure/eventStore/emmetPostgresqlAdapter";
import type { StreamNamePolicyPort } from "@src/application/ports/streamNamePort";
import { StreamNamePolicyAdapter } from "@src/infrastructure/eventStore/streamNamePolicyAdapter";
import { OrderReadRepository as InfraOrderReadRepository } from "@src/infrastructure/readModel/orderReadRepository";
import { OrderLineItemsReadRepositoryPort } from "@src/infrastructure/readModel/orderLineItemsReadRepository";
import { OrderLineItemsReadRepository } from "@src/application/read/orderLineItemsReadRepository";
import { OrderReadRepository as AppOrderReadRepository } from "@src/application/read/orderReadRepository";
import { ShippingClient } from "@shopana/shipping-api";
import { PricingClient } from "@shopana/pricing-api";
import { OrderService } from "@src/application/services/orderService";
import type { ServiceBroker } from "moleculer";
import { InventoryClient } from "@shopana/inventory-api";
import { CheckoutClient } from "@shopana/checkout-api";
import { OrdersPiiRepository } from "@src/infrastructure/pii/ordersPiiRepository";
import { OrderNumberRepository } from "@src/infrastructure/orderNumber/orderNumberRepository";

export class App {
  private static instance: App | null = null;

  public logger!: ReturnType<typeof createLogger>;

  public broker!: ServiceBroker;
  public inventoryClient!: InventoryClient;
  public shippingClient!: ShippingClient;
  public pricingClient!: PricingClient;
  public checkoutClient!: CheckoutClient;

  public eventStore!: EventStorePort;
  public streamNames!: StreamNamePolicyPort;
  public idempotencyRepository!: IdempotencyRepository;
  public readModelRepository!: InfraOrderReadRepository;
  public lineItemsReadRepository!: OrderLineItemsReadRepository;
  public orderReadRepository!: AppOrderReadRepository;
  public orderService!: OrderService;
  public orderUsecase!: OrderUsecase;
  public ordersPiiRepository!: OrdersPiiRepository;
  public orderNumberRepository!: OrderNumberRepository;

  private constructor() {}

  /**
   * Set broker instance - should be called once during service startup
   */
  public setBroker(broker: ServiceBroker): void {
    this.broker = broker;
    this.inventoryClient = new InventoryClient(this.broker);
    this.shippingClient = new ShippingClient(this.broker);
    this.pricingClient = new PricingClient(this.broker);
    this.checkoutClient = new CheckoutClient(this.broker);
  }

  /**
   * Create and initialize App instance with broker
   */
  public static create(broker: ServiceBroker): App {
    const app = new App();

    // Initialize basic dependencies
    app.logger = createLogger();
    app.broker = broker;

    // Initialize API clients
    app.inventoryClient = new InventoryClient(broker);
    app.shippingClient = new ShippingClient(broker);
    app.pricingClient = new PricingClient(broker);
    app.checkoutClient = new CheckoutClient(broker);

    // Initialize infrastructure dependencies
    app.eventStore = new EmmetPostgresqlEventStoreAdapter();
    app.streamNames = new StreamNamePolicyAdapter();
    app.idempotencyRepository = new IdempotencyRepository(dumboPool.execute);
    app.readModelRepository = new InfraOrderReadRepository();
    app.lineItemsReadRepository = new OrderLineItemsReadRepository(
      new OrderLineItemsReadRepositoryPort()
    );
    app.orderReadRepository = new AppOrderReadRepository(
      app.readModelRepository,
      app.lineItemsReadRepository
    );
    app.orderService = new OrderService(
      app.pricingClient,
      app.inventoryClient
    );
    app.ordersPiiRepository = new OrdersPiiRepository();
    app.orderNumberRepository = new OrderNumberRepository();
    app.orderUsecase = new OrderUsecase({
      eventStore: app.eventStore,
      streamNames: app.streamNames,
      logger: app.logger,
      inventory: app.inventoryClient,
      shippingApiClient: app.shippingClient,
      pricingApiClient: app.pricingClient,
      checkoutApiClient: app.checkoutClient,
      orderService: app.orderService,
      orderReadRepository: app.orderReadRepository,
      ordersPiiRepository: app.ordersPiiRepository,
      idempotencyRepository: app.idempotencyRepository,
    });

    this.instance = app;
    return app;
  }

  public static getInstance(): App {
    if (this.instance === null) {
      this.instance = new App();
    }
    return this.instance;
  }
}
