import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { CheckoutNestService } from "./checkout.nest-service";
import { CheckoutMutationRepository } from "./infrastructure/mutations/CheckoutMutationRepository.js";
import { CheckoutPlacementRepository } from "./infrastructure/mutations/CheckoutPlacementRepository.js";
import { PlaceOrderWorkflow } from "./workflows/PlaceOrderWorkflow.js";
import { MonitorPlacedPaymentWorkflow } from "./workflows/MonitorPlacedPaymentWorkflow.js";
import { CheckoutMaintenanceWorkflow } from "./workflows/CheckoutMaintenanceWorkflow.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "checkout" })],
  providers: [
    CheckoutNestService,
    CheckoutMutationRepository,
    CheckoutPlacementRepository,
    PlaceOrderWorkflow,
    MonitorPlacedPaymentWorkflow,
    CheckoutMaintenanceWorkflow,
  ],
})
export class CheckoutModule {}
