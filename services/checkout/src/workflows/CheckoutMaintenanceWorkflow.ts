import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  type ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { CheckoutMutationRepository } from "../infrastructure/mutations/CheckoutMutationRepository.js";
import { CheckoutPlacementRepository } from "../infrastructure/mutations/CheckoutPlacementRepository.js";
import type { PlaceOrderWorkflowResult } from "./PlaceOrderWorkflow.js";

export interface CheckoutMaintenanceInput {
  minuteBucket: string;
}

@Injectable()
export class CheckoutMaintenanceWorkflow extends BrokerWorkflows<
  CheckoutMaintenanceInput,
  { reconciled: number; expired: number; anonymized: number; purged: number }
> {
  constructor(
    @InjectBroker("checkout") broker: ServiceBroker,
    private readonly checkouts: CheckoutMutationRepository,
    private readonly placements: CheckoutPlacementRepository,
  ) {
    super(broker);
  }

  @Workflow("maintainCheckout", { idempotencyStrategy: "content" })
  async run(_input: CheckoutMaintenanceInput) {
    const retention = await this.enforceRetention();
    const stuck = await this.findStuckPlacements();
    let reconciled = 0;
    for (const placement of stuck) {
      const status = await this.getWorkflowStatus(placement.workflowId);
      if (status?.status !== "SUCCESS" || !isPlacementResult(status.output)) continue;
      await this.completePlacement(placement.placementId, status.output);
      reconciled += 1;
    }
    return { reconciled, ...retention };
  }

  @WorkflowStep({ retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 } })
  private enforceRetention() {
    return this.checkouts.enforceRetention();
  }

  @WorkflowStep()
  private findStuckPlacements() {
    return this.placements.listStuck(300);
  }

  @WorkflowStep()
  private getWorkflowStatus(workflowId: string) {
    return DBOS.getWorkflowStatus(workflowId);
  }

  @WorkflowStep({ retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 } })
  private async completePlacement(
    placementId: string,
    result: PlaceOrderWorkflowResult,
  ): Promise<void> {
    await this.placements.complete(placementId, result);
  }
}

function isPlacementResult(value: unknown): value is PlaceOrderWorkflowResult {
  return Boolean(
    value && typeof value === "object" &&
    "placementId" in value && typeof value.placementId === "string" &&
    "orderId" in value && typeof value.orderId === "string" &&
    "status" in value && typeof value.status === "string",
  );
}

