import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "@src/infrastructure/db/database";
import { IdempotencyRepository } from "./idempotency/IdempotencyRepository.js";
import { OrderNumberRepository } from "./order-number/OrderNumberRepository.js";
import { OrdersPiiRepository } from "./pii/OrdersPiiRepository.js";
import { OrderLineItemRepository } from "./order/OrderLineItemRepository.js";
import { OrderReadRepository } from "./order/OrderReadRepository.js";
import { OrderRepository } from "./order/OrderRepository.js";

export interface RepositoryConfig {
  db: Database;
}

export type { Database };

export class Repository {
  readonly order: OrderRepository;
  readonly orderRead: OrderReadRepository;
  readonly orderLineItem: OrderLineItemRepository;
  readonly idempotency: IdempotencyRepository;
  readonly orderNumber: OrderNumberRepository;
  readonly pii: OrdersPiiRepository;
  readonly txManager: TransactionManager<Database>;

  private constructor(
    order: OrderRepository,
    orderRead: OrderReadRepository,
    orderLineItem: OrderLineItemRepository,
    idempotency: IdempotencyRepository,
    orderNumber: OrderNumberRepository,
    pii: OrdersPiiRepository,
    txManager: TransactionManager<Database>,
  ) {
    this.order = order;
    this.orderRead = orderRead;
    this.orderLineItem = orderLineItem;
    this.idempotency = idempotency;
    this.orderNumber = orderNumber;
    this.pii = pii;
    this.txManager = txManager;
  }

  static async create(config: RepositoryConfig): Promise<Repository> {
    const { db } = config;
    const txManager = new TransactionManager(db);
    const idempotency = new IdempotencyRepository(db, txManager);
    const orderNumber = new OrderNumberRepository(db, txManager);
    const pii = new OrdersPiiRepository(db, txManager);
    const orderRead = new OrderReadRepository(db, txManager);
    const orderLineItem = new OrderLineItemRepository(db, txManager);
    const order = new OrderRepository(db, txManager, orderNumber, pii, idempotency);

    return new Repository(
      order,
      orderRead,
      orderLineItem,
      idempotency,
      orderNumber,
      pii,
      txManager,
    );
  }

  get db(): Database {
    return this.txManager.getConnection() as Database;
  }
}
