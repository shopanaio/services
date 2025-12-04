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
import { createServiceApi } from "@shopana/shared-service-api";
import type { ServiceApi } from "@shopana/shared-service-api";
import { OrderService } from "@src/application/services/orderService";
import type { ServiceBroker } from "@shopana/shared-kernel";
import { OrdersPiiRepository } from "@src/infrastructure/pii/ordersPiiRepository";
import { OrderNumberRepository } from "@src/infrastructure/orderNumber/orderNumberRepository";

export class App {
  private static instance: App | null = null;

  public logger!: ReturnType<typeof createLogger>;

  public broker!: ServiceBroker;
  public serviceApi!: ServiceApi;

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
    this.serviceApi = createServiceApi(this.broker);
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
    app.serviceApi = createServiceApi(broker);

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
      app.serviceApi.pricing,
      app.serviceApi.inventory
    );
    app.ordersPiiRepository = new OrdersPiiRepository();
    app.orderNumberRepository = new OrderNumberRepository();
    app.orderUsecase = new OrderUsecase({
      eventStore: app.eventStore,
      streamNames: app.streamNames,
      logger: app.logger,
      inventory: app.serviceApi.inventory,
      shippingApiClient: app.serviceApi.shipping,
      pricingApiClient: app.serviceApi.pricing,
      checkoutApiClient: app.serviceApi.checkout,
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
