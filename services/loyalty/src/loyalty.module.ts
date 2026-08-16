import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { LoyaltyBrokerActions } from "./actions/index.js";
import { LoyaltyEventHandlers } from "./handlers/index.js";
import { LoyaltyNestService } from "./loyalty.nest-service.js";
import {
  CommitRedemptionWorkflow,
  ExpireRedemptionsWorkflow,
  ReleaseRedemptionWorkflow,
  ReserveRedemptionWorkflow,
  ReverseRedemptionWorkflow,
} from "./workflows/CheckoutRedemptionWorkflows.js";
import {
  OrderRewardEligibleWorkflow,
  OrderRewardReversedWorkflow,
} from "./workflows/OrderRewardWorkflows.js";
import { LoyaltyMaintenanceWorkflow } from "./workflows/LoyaltyMaintenanceWorkflow.js";
import { StoreCloseWorkflow } from "./workflows/StoreCloseWorkflow.js";
import { ExternalRewardWorkflow } from "./workflows/ExternalRewardWorkflow.js";
import { ManualAdjustmentWorkflow } from "./workflows/ManualAdjustmentWorkflow.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "loyalty" })],
  providers: [
    LoyaltyBrokerActions,
    LoyaltyEventHandlers,
    LoyaltyNestService,
    ReserveRedemptionWorkflow,
    CommitRedemptionWorkflow,
    ReleaseRedemptionWorkflow,
    ExpireRedemptionsWorkflow,
    ReverseRedemptionWorkflow,
    OrderRewardEligibleWorkflow,
    OrderRewardReversedWorkflow,
    LoyaltyMaintenanceWorkflow,
    StoreCloseWorkflow,
    ExternalRewardWorkflow,
    ManualAdjustmentWorkflow,
  ],
})
export class LoyaltyModule {}

export * from "./contracts/index.js";
export * from "./application/index.js";
export * from "./workflows/index.js";
