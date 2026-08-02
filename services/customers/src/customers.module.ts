import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { CustomersNestService } from "./customers.nest-service.js";
import { workflows } from "./workflows/index.js";
import { StoreEventHandlers } from "./handlers/StoreEventHandlers.js";
import { ApplicationUserEventHandlers } from "./handlers/ApplicationUserEventHandlers.js";
import { CustomersBrokerActions } from "./actions/index.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "customers" })],
  providers: [
    CustomersNestService,
    StoreEventHandlers,
    ApplicationUserEventHandlers,
    CustomersBrokerActions,
    ...workflows,
  ],
})
export class CustomersModule {}

export type * from "./checkout-pipeline/contracts.js";
export * from "./checkout-pipeline/schemas.js";
