import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { BrokerModule } from "@shopana/shared-kernel";
import { CustomersNestService } from "./customers.nest-service.js";
import { workflows } from "./workflows/index.js";
import { StoreEventHandlers } from "./handlers/StoreEventHandlers.js";
import { ApplicationUserEventHandlers } from "./handlers/ApplicationUserEventHandlers.js";
import {
  CheckoutEventHandlers,
  OrderEventHandlers,
  RefundEventHandlers,
} from "./handlers/CustomerStatisticsEventHandlers.js";
import { CustomerDynamicSegmentEventHandlers } from "./handlers/CustomerDynamicSegmentEventHandlers.js";
import { CustomerLifecycleJobEventHandlers } from "./handlers/CustomerLifecycleJobEventHandlers.js";
import { CustomerExternalReferenceBrokerActions, CustomersBrokerActions } from "./actions/index.js";
import { CustomerSegmentMaintenanceScheduler } from "./segments/CustomerSegmentMaintenanceScheduler.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "customers" }), ScheduleModule.forRoot()],
  providers: [
    CustomersNestService,
    StoreEventHandlers,
    ApplicationUserEventHandlers,
    OrderEventHandlers,
    CheckoutEventHandlers,
    RefundEventHandlers,
    CustomerDynamicSegmentEventHandlers,
    CustomerLifecycleJobEventHandlers,
    CustomersBrokerActions,
    CustomerExternalReferenceBrokerActions,
    CustomerSegmentMaintenanceScheduler,
    ...workflows,
  ],
})
export class CustomersModule {}

export type * from "./checkout-pipeline/contracts.js";
export * from "./checkout-pipeline/schemas.js";
