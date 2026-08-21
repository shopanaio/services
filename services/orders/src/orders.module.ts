import { Module } from "@nestjs/common";
import {
  BrokerModule,
  DATABASE_CLIENT,
  DATABASE_CONNECTION_OPTIONS,
  type DatabaseClient,
  type DatabaseConnectionOptions,
} from "@shopana/shared-kernel";
import { OrdersNestService } from "./orders.nest-service";
import { createDatabase } from "./infrastructure/db/database.js";
import { Repository } from "./repositories/Repository.js";
import {
  PublishOrderLoyaltyRewardEligibleWorkflow,
  PublishOrderLoyaltyRewardReversedWorkflow,
} from "./workflows/LoyaltyRewardWorkflows.js";
import { OrderPaymentEventHandlers } from "./handlers/OrderPaymentEventHandlers.js";
import { createOrdersDbosTransactionBridge } from "./infrastructure/db/dbosTransactionBridge.js";
import {
  CancelOrderFromCheckoutPlacementWorkflow,
  ConfirmOrderFromCheckoutPlacementWorkflow,
  CreateOrderFromCheckoutPlacementWorkflow,
} from "./workflows/checkout-placement/OrderCheckoutPlacementWorkflows.js";
import { ProjectOrderPaymentEventWorkflow } from "./workflows/payment/ProjectOrderPaymentEventWorkflow.js";
import { ApplyDeliveryShipmentUpdateWorkflow } from "./workflows/fulfillment/ApplyDeliveryShipmentUpdateWorkflow.js";
import { adminOrderCommandWorkflowProviders } from "./workflows/admin/AdminOrderCommandWorkflows.js";
import {
  ApplyOrderIntegrationEventWorkflow,
  ApplyOrderIntegrationImportWorkflow,
  CompleteOrderFulfillmentServiceOperationWorkflow,
} from "./workflows/integration/OrderProviderCallbackWorkflows.js";
import { AdminOrderCommandService } from "./application/admin/AdminOrderCommandService.js";
import { ADMIN_ORDER_COMMAND_PERSISTENCE } from "./application/admin/AdminOrderCommandPorts.js";
import {
  CancelOrderFromStorefrontWorkflow,
  CreateOrderReturnRequestFromStorefrontWorkflow,
} from "./workflows/storefront/StorefrontOrderWorkflows.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "order" })],
  providers: [
    {
      provide: Repository,
      inject: [DATABASE_CLIENT, DATABASE_CONNECTION_OPTIONS],
      useFactory: (client: DatabaseClient, connection: DatabaseConnectionOptions) =>
        Repository.create({
          db: createDatabase(client as unknown as Parameters<typeof createDatabase>[0]),
          dbosTransactionBridge: createOrdersDbosTransactionBridge(connection),
        }),
    },
    OrdersNestService,
    PublishOrderLoyaltyRewardEligibleWorkflow,
    PublishOrderLoyaltyRewardReversedWorkflow,
    OrderPaymentEventHandlers,
    CreateOrderFromCheckoutPlacementWorkflow,
    ConfirmOrderFromCheckoutPlacementWorkflow,
    CancelOrderFromCheckoutPlacementWorkflow,
    ProjectOrderPaymentEventWorkflow,
    ApplyDeliveryShipmentUpdateWorkflow,
    CompleteOrderFulfillmentServiceOperationWorkflow,
    ApplyOrderIntegrationEventWorkflow,
    ApplyOrderIntegrationImportWorkflow,
    {
      provide: ADMIN_ORDER_COMMAND_PERSISTENCE,
      inject: [Repository],
      useFactory: (repository: Repository) => repository.admin,
    },
    AdminOrderCommandService,
    CancelOrderFromStorefrontWorkflow,
    CreateOrderReturnRequestFromStorefrontWorkflow,
    ...adminOrderCommandWorkflowProviders,
  ],
  exports: [Repository],
})
export class OrdersModule {}
