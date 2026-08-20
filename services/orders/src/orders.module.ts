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
  ],
  exports: [Repository],
})
export class OrdersModule {}
