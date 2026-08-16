import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { LoyaltyBrokerActions } from "./actions/index.js";
import { LoyaltyEventHandlers } from "./handlers/index.js";
import { LoyaltyNestService } from "./loyalty.nest-service.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "loyalty" })],
  providers: [LoyaltyBrokerActions, LoyaltyEventHandlers, LoyaltyNestService],
})
export class LoyaltyModule {}

export * from "./contracts/index.js";
