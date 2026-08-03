import { OrderUsecase } from "@src/application/order/orderUsecase";
import { IdempotencyRepository } from "@src/infrastructure/idempotency/idempotencyRepository";
import { createLogger } from "@src/infrastructure/logger/pino";
import type { EventStorePort } from "@src/application/ports/eventStorePort";
import { DrizzleOrderEventStoreAdapter } from "@src/infrastructure/eventStore/drizzleOrderEventStoreAdapter";
import type { StreamNamePolicyPort } from "@src/application/ports/streamNamePort";
import { StreamNamePolicyAdapter } from "@src/infrastructure/eventStore/streamNamePolicyAdapter";
import { OrderReadRepository as InfraOrderReadRepository } from "@src/infrastructure/readModel/orderReadRepository";
import { OrderLineItemsReadRepositoryPort } from "@src/infrastructure/readModel/orderLineItemsReadRepository";
import { OrderLineItemsReadRepository } from "@src/application/read/orderLineItemsReadRepository";
import { OrderReadRepository as AppOrderReadRepository } from "@src/application/read/orderReadRepository";
import { TransactionManager } from "@shopana/shared-kernel";
import { OrdersPiiRepository } from "@src/infrastructure/pii/ordersPiiRepository";
import { OrderNumberRepository } from "@src/infrastructure/orderNumber/orderNumberRepository";
import type { Database } from "@src/infrastructure/db/database";
import { OrderCreateProjection } from "@src/infrastructure/projections/orderCreateProjection";

export class App {
  private static instance: App | null = null;

  public logger!: ReturnType<typeof createLogger>;

  public eventStore!: EventStorePort;
  public streamNames!: StreamNamePolicyPort;
  public idempotencyRepository!: IdempotencyRepository;
  public readModelRepository!: InfraOrderReadRepository;
  public lineItemsReadRepository!: OrderLineItemsReadRepository;
  public orderReadRepository!: AppOrderReadRepository;
  public orderUsecase!: OrderUsecase;
  public ordersPiiRepository!: OrdersPiiRepository;
  public orderNumberRepository!: OrderNumberRepository;
  public txManager!: TransactionManager<Database>;

  private constructor() {}

  public static create(db: Database): App {
    const app = new App();

    // Initialize basic dependencies
    app.logger = createLogger();
    // Initialize infrastructure dependencies
    app.txManager = new TransactionManager(db);
    app.streamNames = new StreamNamePolicyAdapter();
    app.idempotencyRepository = new IdempotencyRepository(db, app.txManager);
    app.orderNumberRepository = new OrderNumberRepository(db, app.txManager);
    app.ordersPiiRepository = new OrdersPiiRepository(db, app.txManager);
    const orderCreateProjection = new OrderCreateProjection(
      db,
      app.txManager,
      app.orderNumberRepository,
      app.ordersPiiRepository,
      app.idempotencyRepository,
    );
    app.eventStore = new DrizzleOrderEventStoreAdapter(
      db,
      app.txManager,
      orderCreateProjection,
    );
    app.readModelRepository = new InfraOrderReadRepository(db, app.txManager);
    app.lineItemsReadRepository = new OrderLineItemsReadRepository(
      new OrderLineItemsReadRepositoryPort(db, app.txManager)
    );
    app.orderReadRepository = new AppOrderReadRepository(
      app.readModelRepository,
      app.lineItemsReadRepository
    );
    app.orderUsecase = new OrderUsecase({
      eventStore: app.eventStore,
      streamNames: app.streamNames,
      logger: app.logger,
      orderReadRepository: app.orderReadRepository,
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
