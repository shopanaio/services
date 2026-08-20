import { OrderUsecase } from "@src/application/order/orderUsecase";
import { OrderLineItemsReadRepository } from "@src/application/read/orderLineItemsReadRepository";
import { OrderReadRepository as AppOrderReadRepository } from "@src/application/read/orderReadRepository";
import { createLogger } from "@src/infrastructure/logger/pino";
import { Repository } from "@src/repositories/Repository";

export class App {
  private static instance: App | null = null;

  public logger!: ReturnType<typeof createLogger>;
  public repository!: Repository;
  public orderReadRepository!: AppOrderReadRepository;
  public orderUsecase!: OrderUsecase;

  private constructor() {}

  public static create(repository: Repository): App {
    const app = new App();
    app.logger = createLogger();
    app.repository = repository;

    const lineItemsReadRepository = new OrderLineItemsReadRepository(app.repository.orderLineItem);
    app.orderReadRepository = new AppOrderReadRepository(
      app.repository.orderRead,
      lineItemsReadRepository,
    );
    app.orderUsecase = new OrderUsecase({
      logger: app.logger,
      repository: app.repository,
      orderReadRepository: app.orderReadRepository,
    });

    this.instance = app;
    return app;
  }

  public static getInstance(): App {
    if (this.instance === null) this.instance = new App();
    return this.instance;
  }
}
