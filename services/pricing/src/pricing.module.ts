import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { eventHandlers } from "./handlers/index.js";
import { PricingNestService } from "./pricing.nest-service.js";
import { workflows } from "./workflows/index.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "pricing" })],
  providers: [PricingNestService, ...eventHandlers, ...workflows],
})
export class PricingModule {}
