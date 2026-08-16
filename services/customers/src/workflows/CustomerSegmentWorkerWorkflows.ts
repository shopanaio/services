import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  type ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import {
  CustomerSegmentMaterializationPageScript,
  CustomerSegmentReevaluationBatchScript,
  CustomerSegmentTemporalBatchScript,
  type CustomerSegmentWorkerResult,
} from "../scripts/classification/index.js";

export interface CustomerSegmentWorkerWorkflowInput {
  readonly context: RunScriptContext;
}

@Injectable()
export class CustomerSegmentMaterializationWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerSegmentMaterialize")
  async run(input: CustomerSegmentWorkerWorkflowInput): Promise<void> {
    for (let cycle = 0; cycle < 10_000; cycle += 1) {
      const materialization = await this.materialize(input);
      if (materialization.state === "MORE") continue;
      if (materialization.state === "WAITING") {
        const queue = await this.reevaluate(input);
        const temporal = await this.temporal(input);
        if (
          queue.state === "MORE" ||
          temporal.state === "MORE" ||
          queue.processed > 0 ||
          temporal.processed > 0
        ) continue;
        return;
      }
      if (materialization.state === "IDLE" || materialization.state === "READY") {
        return;
      }
    }
    throw new Error("Customer segment materialization exceeded workflow page budget");
  }

  @WorkflowStep()
  private materialize(
    input: CustomerSegmentWorkerWorkflowInput,
  ): Promise<CustomerSegmentWorkerResult> {
    return Kernel.getInstance().runScript(
      CustomerSegmentMaterializationPageScript,
      { workerId: DBOS.workflowID! },
      input.context,
    );
  }

  @WorkflowStep()
  private reevaluate(
    input: CustomerSegmentWorkerWorkflowInput,
  ): Promise<CustomerSegmentWorkerResult> {
    return Kernel.getInstance().runScript(
      CustomerSegmentReevaluationBatchScript,
      { workerId: DBOS.workflowID! },
      input.context,
    );
  }

  @WorkflowStep()
  private temporal(
    input: CustomerSegmentWorkerWorkflowInput,
  ): Promise<CustomerSegmentWorkerResult> {
    return Kernel.getInstance().runScript(
      CustomerSegmentTemporalBatchScript,
      { workerId: DBOS.workflowID! },
      input.context,
    );
  }
}

@Injectable()
export class CustomerSegmentMaintenanceWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerSegmentMaintenance")
  async run(input: CustomerSegmentWorkerWorkflowInput): Promise<void> {
    for (let cycle = 0; cycle < 10_000; cycle += 1) {
      const queue = await this.reevaluate(input);
      const temporal = await this.temporal(input);
      const materialization = await this.materialize(input);
      if (
        queue.state === "IDLE" &&
        temporal.state === "IDLE" &&
        materialization.state === "IDLE"
      ) return;
    }
    throw new Error("Customer segment maintenance exceeded workflow batch budget");
  }

  @WorkflowStep()
  private reevaluate(input: CustomerSegmentWorkerWorkflowInput) {
    return Kernel.getInstance().runScript(
      CustomerSegmentReevaluationBatchScript,
      { workerId: DBOS.workflowID! },
      input.context,
    );
  }

  @WorkflowStep()
  private temporal(input: CustomerSegmentWorkerWorkflowInput) {
    return Kernel.getInstance().runScript(
      CustomerSegmentTemporalBatchScript,
      { workerId: DBOS.workflowID! },
      input.context,
    );
  }

  @WorkflowStep()
  private materialize(input: CustomerSegmentWorkerWorkflowInput) {
    return Kernel.getInstance().runScript(
      CustomerSegmentMaterializationPageScript,
      { workerId: DBOS.workflowID! },
      input.context,
    );
  }
}
