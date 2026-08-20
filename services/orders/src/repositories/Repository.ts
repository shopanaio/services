import { TransactionManager } from "@shopana/shared-kernel";
import type { DbosTransactionBridge, PostgresTransactionOptions } from "@shopana/shared-kernel";
import type { Database } from "@src/infrastructure/db/database";
import { IdempotencyRepository } from "./idempotency/IdempotencyRepository.js";
import { OrderNumberRepository } from "./order-number/OrderNumberRepository.js";
import { OrdersPiiRepository } from "./pii/OrdersPiiRepository.js";
import { OrderLineItemRepository } from "./order/OrderLineItemRepository.js";
import { OrderReadRepository } from "./order/OrderReadRepository.js";
import { OrderRepository } from "./order/OrderRepository.js";
import { DeliveryFulfillmentRepository } from "./fulfillment/DeliveryFulfillmentRepository.js";
import { OrderCheckoutPlacementRepository } from "./placement/OrderCheckoutPlacementRepository.js";
import { AdminOrderReadRepository } from "./admin/AdminOrderReadRepository.js";
import { AdminOrderDraftRepository } from "./admin/AdminOrderDraftRepository.js";
import { AdminOrderEditRepository } from "./admin/AdminOrderEditRepository.js";
import { AdminOrderPaymentRepository } from "./admin/AdminOrderPaymentRepository.js";
import { AdminOrderFulfillmentRepository } from "./admin/AdminOrderFulfillmentRepository.js";
import { AdminOrderReturnRepository } from "./admin/AdminOrderReturnRepository.js";
import { AdminOrderIntegrationRepository } from "./admin/AdminOrderIntegrationRepository.js";
import { AdminOrderOperationRepository } from "./admin/AdminOrderOperationRepository.js";
import { AdminOrderProviderRepository } from "./admin/AdminOrderProviderRepository.js";
import { AdminOrderBulkSelectionRepository } from "./admin/AdminOrderBulkSelectionRepository.js";

export type AdminOrderRepositories = Readonly<{
  draft: AdminOrderDraftRepository;
  edit: AdminOrderEditRepository;
  payment: AdminOrderPaymentRepository;
  fulfillment: AdminOrderFulfillmentRepository;
  returns: AdminOrderReturnRepository;
  integration: AdminOrderIntegrationRepository;
  operation: AdminOrderOperationRepository;
  provider: AdminOrderProviderRepository;
  bulkSelection: AdminOrderBulkSelectionRepository;
}>;

export interface RepositoryConfig {
  db: Database;
  dbosTransactionBridge: DbosTransactionBridge<Database, PostgresTransactionOptions>;
}

export type { Database };

export class Repository {
  readonly order: OrderRepository;
  readonly orderRead: OrderReadRepository;
  readonly orderLineItem: OrderLineItemRepository;
  readonly idempotency: IdempotencyRepository;
  readonly orderNumber: OrderNumberRepository;
  readonly pii: OrdersPiiRepository;
  readonly fulfillment: DeliveryFulfillmentRepository;
  readonly checkoutPlacement: OrderCheckoutPlacementRepository;
  readonly admin: AdminOrderRepositories;
  readonly adminRead: AdminOrderReadRepository;
  readonly txManager: TransactionManager<Database>;
  readonly dbosTransactionBridge: DbosTransactionBridge<Database, PostgresTransactionOptions>;

  private constructor(
    order: OrderRepository,
    orderRead: OrderReadRepository,
    orderLineItem: OrderLineItemRepository,
    idempotency: IdempotencyRepository,
    orderNumber: OrderNumberRepository,
    pii: OrdersPiiRepository,
    fulfillment: DeliveryFulfillmentRepository,
    checkoutPlacement: OrderCheckoutPlacementRepository,
    admin: AdminOrderRepositories,
    adminRead: AdminOrderReadRepository,
    txManager: TransactionManager<Database>,
    dbosTransactionBridge: DbosTransactionBridge<Database, PostgresTransactionOptions>,
  ) {
    this.order = order;
    this.orderRead = orderRead;
    this.orderLineItem = orderLineItem;
    this.idempotency = idempotency;
    this.orderNumber = orderNumber;
    this.pii = pii;
    this.fulfillment = fulfillment;
    this.checkoutPlacement = checkoutPlacement;
    this.admin = admin;
    this.adminRead = adminRead;
    this.txManager = txManager;
    this.dbosTransactionBridge = dbosTransactionBridge;
  }

  static async create(config: RepositoryConfig): Promise<Repository> {
    const { db, dbosTransactionBridge } = config;
    const txManager = new TransactionManager(db);
    const idempotency = new IdempotencyRepository(db, txManager);
    const orderNumber = new OrderNumberRepository(db, txManager);
    const pii = new OrdersPiiRepository(db, txManager);
    const orderRead = new OrderReadRepository(db, txManager);
    const orderLineItem = new OrderLineItemRepository(db, txManager);
    const order = new OrderRepository(db, txManager, orderNumber, pii, idempotency);
    const fulfillment = new DeliveryFulfillmentRepository(db, txManager);
    const checkoutPlacement = new OrderCheckoutPlacementRepository(db, txManager, orderNumber);
    const adminOperation = new AdminOrderOperationRepository(db, txManager);
    const admin = {
      draft: new AdminOrderDraftRepository(db, txManager, orderNumber),
      edit: new AdminOrderEditRepository(db, txManager, adminOperation),
      payment: new AdminOrderPaymentRepository(db, txManager),
      fulfillment: new AdminOrderFulfillmentRepository(db, txManager),
      returns: new AdminOrderReturnRepository(db, txManager),
      integration: new AdminOrderIntegrationRepository(db, txManager, adminOperation),
      operation: adminOperation,
      provider: new AdminOrderProviderRepository(db, txManager, adminOperation),
      bulkSelection: new AdminOrderBulkSelectionRepository(db, txManager),
    } satisfies AdminOrderRepositories;
    const adminRead = new AdminOrderReadRepository(db, txManager);

    return new Repository(
      order,
      orderRead,
      orderLineItem,
      idempotency,
      orderNumber,
      pii,
      fulfillment,
      checkoutPlacement,
      admin,
      adminRead,
      txManager,
      dbosTransactionBridge,
    );
  }

  get db(): Database {
    return this.txManager.getConnection() as Database;
  }
}
