import { CheckoutUsecase } from "@src/application/checkout/checkoutUsecase";
import { IdempotencyRepository } from "@src/infrastructure/idempotency/idempotencyRepository";
import { dumboPool } from "@src/infrastructure/db/dumbo";
import { createLogger } from "@src/infrastructure/logger/pino";
import type { EventStorePort } from "@src/application/ports/eventStorePort";
import { EmmetPostgresqlEventStoreAdapter } from "@src/infrastructure/eventStore/emmetPostgresqlAdapter";
import type { StreamNamePolicyPort } from "@src/application/ports/streamNamePort";
import { StreamNamePolicyAdapter } from "@src/infrastructure/eventStore/streamNamePolicyAdapter";
import { CheckoutReadRepository as InfraCheckoutReadRepository } from "@src/infrastructure/readModel/checkoutReadRepository";
import { CheckoutLineItemsReadRepositoryPort } from "@src/infrastructure/readModel/checkoutLineItemsReadRepository";
import { CheckoutLineItemsReadRepository } from "@src/application/read/checkoutLineItemsReadRepository";
import { CheckoutReadRepository as AppCheckoutReadRepository } from "@src/application/read/checkoutReadRepository";
import { ShippingClient } from "@shopana/shipping-api";
import { PricingClient } from "@shopana/pricing-api";
import { CheckoutService } from "@src/application/services/checkoutService";
import type { ServiceBroker } from "moleculer";
import { InventoryClient } from "@shopana/inventory-api";

export class App {
  private static instance: App | null = null;

  public logger!: ReturnType<typeof createLogger>;

  public broker!: ServiceBroker;
  public inventoryClient!: InventoryClient;
  public shippingClient!: ShippingClient;
  public pricingClient!: PricingClient;

  public eventStore!: EventStorePort;
  public streamNames!: StreamNamePolicyPort;
  public idempotencyRepository!: IdempotencyRepository;
  public readModelRepository!: InfraCheckoutReadRepository;
  public lineItemsReadRepository!: CheckoutLineItemsReadRepository;
  public checkoutReadRepository!: AppCheckoutReadRepository;
  public checkoutService!: CheckoutService;
  public checkoutUsecase!: CheckoutUsecase;

  private constructor() {}

  /**
   * Set broker instance - should be called once during service startup
   */
  public setBroker(broker: ServiceBroker): void {
    this.broker = broker;
    this.inventoryClient = new InventoryClient(this.broker);
    this.shippingClient = new ShippingClient(this.broker);
    this.pricingClient = new PricingClient(this.broker);
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

    // Initialize infrastructure dependencies
    app.eventStore = new EmmetPostgresqlEventStoreAdapter();
    app.streamNames = new StreamNamePolicyAdapter();
    app.idempotencyRepository = new IdempotencyRepository(dumboPool.execute);
    app.readModelRepository = new InfraCheckoutReadRepository();
    app.lineItemsReadRepository = new CheckoutLineItemsReadRepository(
      new CheckoutLineItemsReadRepositoryPort()
    );
    app.checkoutReadRepository = new AppCheckoutReadRepository(
      app.readModelRepository,
      app.lineItemsReadRepository
    );
    app.checkoutService = new CheckoutService(
      app.pricingClient,
      app.inventoryClient
    );
    app.checkoutUsecase = new CheckoutUsecase({
      eventStore: app.eventStore,
      streamNames: app.streamNames,
      logger: app.logger,
      inventory: app.inventoryClient,
      shippingApiClient: app.shippingClient,
      pricingApiClient: app.pricingClient,
      checkoutService: app.checkoutService,
      checkoutReadRepository: app.checkoutReadRepository,
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
