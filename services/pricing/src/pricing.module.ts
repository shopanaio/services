import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { eventHandlers } from "./handlers/index.js";
import { PricingNestService } from "./pricing.nest-service.js";
import { workflows } from "./workflows/index.js";
import { PricingCheckoutBrokerActions } from "./actions/PricingCheckoutBrokerActions.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "pricing" })],
  providers: [PricingNestService, PricingCheckoutBrokerActions, ...eventHandlers, ...workflows],
})
export class PricingModule {}
