import { CheckoutUsecase } from "@src/application/checkout/checkoutUsecase";
import { IdempotencyRepository } from "@src/infrastructure/idempotency/idempotencyRepository";
import { dumboPool } from "@src/infrastructure/db/dumbo";
import { createLogger } from "@src/infrastructure/logger/pino";
import { CheckoutReadRepository as InfraCheckoutReadRepository } from "@src/infrastructure/readModel/checkoutReadRepository";
import { CheckoutLineItemsReadRepositoryPort } from "@src/infrastructure/readModel/checkoutLineItemsReadRepository";
import { CheckoutLineItemsReadRepository } from "@src/application/read/checkoutLineItemsReadRepository";
import { CheckoutReadRepository as AppCheckoutReadRepository } from "@src/application/read/checkoutReadRepository";
import { createServiceApi } from "@shopana/shared-service-api";
import type { ServiceApi } from "@shopana/shared-service-api";
import { CheckoutService } from "@src/application/services/checkoutService";
import type { ServiceBroker } from "@shopana/shared-kernel";
import { CheckoutWriteRepository } from "@src/infrastructure/writeModel/checkoutWriteRepository";

export class App {
  private static instance: App | null = null;

  public logger!: ReturnType<typeof createLogger>;

  public broker!: ServiceBroker;
  public serviceApi!: ServiceApi;

  public eventStore!: any;
  public streamNames!: any;
  public idempotencyRepository!: IdempotencyRepository;
  public readModelRepository!: InfraCheckoutReadRepository;
  public lineItemsReadRepository!: CheckoutLineItemsReadRepository;
  public checkoutReadRepository!: AppCheckoutReadRepository;
  public checkoutWriteRepository!: CheckoutWriteRepository;
  public checkoutService!: CheckoutService;
  public checkoutUsecase!: CheckoutUsecase;

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
    // Event store removed; using write repository instead
    app.idempotencyRepository = new IdempotencyRepository(dumboPool.execute);
    app.readModelRepository = new InfraCheckoutReadRepository();
    app.lineItemsReadRepository = new CheckoutLineItemsReadRepository(
      new CheckoutLineItemsReadRepositoryPort()
    );
    app.checkoutReadRepository = new AppCheckoutReadRepository(
      app.readModelRepository,
      app.lineItemsReadRepository
    );
    app.checkoutWriteRepository = new CheckoutWriteRepository();
    app.checkoutService = new CheckoutService(
      app.serviceApi.pricing,
      app.serviceApi.inventory
    );
    app.checkoutUsecase = new CheckoutUsecase({
      logger: app.logger,
      inventory: app.serviceApi.inventory,
      shippingApiClient: app.serviceApi.shipping,
      paymentApiClient: app.serviceApi.payment,
      pricingApiClient: app.serviceApi.pricing,
      checkoutService: app.checkoutService,
      checkoutReadRepository: app.checkoutReadRepository,
      checkoutWriteRepository: app.checkoutWriteRepository,
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
