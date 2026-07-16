import { Injectable } from "@nestjs/common";
import type { CustomerUpdatedReason } from "@shopana/events";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import {
  CustomerDataRequestUpdateScript,
  CustomerGroupUpdateScript,
  CustomerMergeUpdateScript,
  CustomerSegmentUpdateScript,
  CustomerTagUpdateScript,
} from "../scripts/index.js";
import type {
  CustomerDataRequestUpdateWorkflowInput,
  CustomerDataRequestUpdateWorkflowResult,
  CustomerGroupUpdateWorkflowInput,
  CustomerGroupUpdateWorkflowResult,
  CustomerMergeUpdateWorkflowInput,
  CustomerMergeUpdateWorkflowResult,
  CustomerMutationWorkflowContext,
  CustomerSegmentUpdateWorkflowInput,
  CustomerSegmentUpdateWorkflowResult,
  CustomerTagUpdateWorkflowInput,
  CustomerTagUpdateWorkflowResult,
  CustomerUpdateOperationResult,
  CustomerUpdateOperationType,
} from "./dto/index.js";

abstract class CustomerEntityUpdateWorkflow extends BrokerWorkflows {
  protected constructor(broker: ServiceBroker) {
    super(broker);
  }

  protected get kernel(): Kernel {
    return Kernel.getInstance();
  }

  protected toScriptContext(
    context: CustomerMutationWorkflowContext
  ): RunScriptContext {
    return {
      storeId: context.storeId,
      organizationId: context.organizationId,
      locale: context.locale,
      userId: context.userId,
      requestId: context.requestId,
    };
  }

  protected operationResult(
    type: CustomerUpdateOperationType,
    errors: CustomerUpdateOperationResult["errors"]
  ): CustomerUpdateOperationResult[] {
    return [{ type, applied: errors.length === 0, errors }];
  }

  protected async emitCustomerUpdated(
    context: CustomerMutationWorkflowContext,
    customerIds: readonly string[],
    reason: CustomerUpdatedReason
  ): Promise<void> {
    for (const customerId of new Set(customerIds)) {
      await this.broker.runWorkflow(
        "events.emit",
        {
          eventType: "customerUpdated",
          payload: {
            customerId,
            storeId: context.storeId,
            reasons: [reason],
          },
          source: "customers",
          context: {
            organizationId: context.organizationId,
            userId: context.userId,
          },
          subject: { type: "customer", id: customerId },
          actor: context.userId
            ? { type: "user" as const, id: context.userId }
            : undefined,
          emitKey: `customer:${customerId}`,
        },
        {
          source: "workflow",
          workflowId: DBOS.workflowID!,
          stepId: `emitCustomerUpdated:${reason}`,
          callId: customerId,
        }
      );
    }
  }
}

@Injectable()
export class CustomerGroupUpdateWorkflow extends CustomerEntityUpdateWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerGroupUpdate")
  async run(
    input: CustomerGroupUpdateWorkflowInput
  ): Promise<CustomerGroupUpdateWorkflowResult> {
    const result = await this.stepUpdate(input);
    if (result.group && result.userErrors.length === 0) {
      await this.emitCustomerUpdated(
        input.context,
        result.affectedCustomerIds,
        "group"
      );
    }
    return {
      ...result,
      operationResults: this.operationResult("groupUpdate", result.userErrors),
    };
  }

  @WorkflowStep()
  private stepUpdate(input: CustomerGroupUpdateWorkflowInput) {
    return this.kernel.runScript(
      CustomerGroupUpdateScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }
}

@Injectable()
export class CustomerTagUpdateWorkflow extends CustomerEntityUpdateWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerTagUpdate")
  async run(
    input: CustomerTagUpdateWorkflowInput
  ): Promise<CustomerTagUpdateWorkflowResult> {
    const result = await this.stepUpdate(input);
    if (result.tag && result.userErrors.length === 0) {
      await this.emitCustomerUpdated(
        input.context,
        result.affectedCustomerIds,
        "tag"
      );
    }
    return {
      ...result,
      operationResults: this.operationResult("tagUpdate", result.userErrors),
    };
  }

  @WorkflowStep()
  private stepUpdate(input: CustomerTagUpdateWorkflowInput) {
    return this.kernel.runScript(
      CustomerTagUpdateScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }
}

@Injectable()
export class CustomerSegmentUpdateWorkflow extends CustomerEntityUpdateWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerSegmentUpdate")
  async run(
    input: CustomerSegmentUpdateWorkflowInput
  ): Promise<CustomerSegmentUpdateWorkflowResult> {
    const result = await this.stepUpdate(input);
    if (result.segment && result.userErrors.length === 0) {
      await this.emitCustomerUpdated(
        input.context,
        result.affectedCustomerIds,
        "segment"
      );
    }
    return {
      ...result,
      operationResults: this.operationResult("segmentUpdate", result.userErrors),
    };
  }

  @WorkflowStep()
  private stepUpdate(input: CustomerSegmentUpdateWorkflowInput) {
    return this.kernel.runScript(
      CustomerSegmentUpdateScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }
}

@Injectable()
export class CustomerMergeUpdateWorkflow extends CustomerEntityUpdateWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerMergeUpdate")
  async run(
    input: CustomerMergeUpdateWorkflowInput
  ): Promise<CustomerMergeUpdateWorkflowResult> {
    const result = await this.stepUpdate(input);
    return {
      ...result,
      operationResults: this.operationResult("mergeUpdate", result.userErrors),
    };
  }

  @WorkflowStep()
  private stepUpdate(input: CustomerMergeUpdateWorkflowInput) {
    return this.kernel.runScript(
      CustomerMergeUpdateScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }
}

@Injectable()
export class CustomerDataRequestUpdateWorkflow extends CustomerEntityUpdateWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerDataRequestUpdate")
  async run(
    input: CustomerDataRequestUpdateWorkflowInput
  ): Promise<CustomerDataRequestUpdateWorkflowResult> {
    const result = await this.stepUpdate(input);
    return {
      ...result,
      operationResults: this.operationResult(
        "dataRequestUpdate",
        result.userErrors
      ),
    };
  }

  @WorkflowStep()
  private stepUpdate(input: CustomerDataRequestUpdateWorkflowInput) {
    return this.kernel.runScript(
      CustomerDataRequestUpdateScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }
}
