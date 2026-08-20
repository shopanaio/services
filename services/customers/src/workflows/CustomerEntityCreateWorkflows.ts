import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
  WorkflowStep,
  type WorkflowExecutionContext,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import {
  CustomerDataRequestCreateScript,
  CustomerGroupCreateScript,
  CustomerMergeCreateScript,
  CustomerSegmentCreateScript,
  CustomerTagCreateScript,
} from "../scripts/index.js";
import type {
  CustomerDataRequestCreateWorkflowInput,
  CustomerDataRequestCreateWorkflowResult,
  CustomerGroupCreateWorkflowInput,
  CustomerGroupCreateWorkflowResult,
  CustomerMergeCreateWorkflowInput,
  CustomerMergeCreateWorkflowResult,
  CustomerMutationWorkflowContext,
  CustomerSegmentCreateWorkflowInput,
  CustomerSegmentCreateWorkflowResult,
  CustomerTagCreateWorkflowInput,
  CustomerTagCreateWorkflowResult,
} from "./dto/index.js";

abstract class CustomerEntityCreateWorkflow extends BrokerWorkflows {
  protected constructor(broker: ServiceBroker) {
    super(broker);
  }

  protected get kernel(): Kernel {
    return Kernel.getInstance();
  }

  protected toScriptContext(context: CustomerMutationWorkflowContext): RunScriptContext {
    return {
      storeId: context.storeId,
      organizationId: context.organizationId,
      locale: context.locale,
      userId: context.userId,
      requestId: context.requestId,
    };
  }
}

@Injectable()
export class CustomerGroupCreateWorkflow extends CustomerEntityCreateWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerGroupCreate")
  @Policy<CustomerGroupCreateWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(input: CustomerGroupCreateWorkflowInput): Promise<CustomerGroupCreateWorkflowResult> {
    return this.stepCreate(input);
  }

  @WorkflowStep()
  private stepCreate(input: CustomerGroupCreateWorkflowInput) {
    return this.kernel.runScript(
      CustomerGroupCreateScript,
      input.params,
      this.toScriptContext(input.context),
    );
  }
}

@Injectable()
export class CustomerTagCreateWorkflow extends CustomerEntityCreateWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerTagCreate")
  @Policy<CustomerTagCreateWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(input: CustomerTagCreateWorkflowInput): Promise<CustomerTagCreateWorkflowResult> {
    return this.stepCreate(input);
  }

  @WorkflowStep()
  private stepCreate(input: CustomerTagCreateWorkflowInput) {
    return this.kernel.runScript(
      CustomerTagCreateScript,
      input.params,
      this.toScriptContext(input.context),
    );
  }
}

@Injectable()
export class CustomerSegmentCreateWorkflow extends CustomerEntityCreateWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerSegmentCreate")
  @Policy<CustomerSegmentCreateWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(
    input: CustomerSegmentCreateWorkflowInput,
  ): Promise<CustomerSegmentCreateWorkflowResult> {
    const result = await this.stepCreate(input);
    if (result.segment && result.userErrors.length === 0) {
      await this.startMaterialization(input, result.segment.id);
    }
    return result;
  }

  @WorkflowStep()
  private stepCreate(input: CustomerSegmentCreateWorkflowInput) {
    return this.kernel.runScript(
      CustomerSegmentCreateScript,
      input.params,
      this.toScriptContext(input.context),
    );
  }

  private startMaterialization(input: CustomerSegmentCreateWorkflowInput, segmentId: string) {
    return this.broker.startWorkflow(
      "customers.customerSegmentMaterialize",
      { context: this.toScriptContext(input.context) },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "startCustomerSegmentMaterialization",
        callId: segmentId,
      },
    );
  }
}

@Injectable()
export class CustomerMergeCreateWorkflow extends CustomerEntityCreateWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerMergeCreate")
  @Policy<CustomerMergeCreateWorkflowInput>({
    resource: "store.data",
    action: "admin",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(
    input: CustomerMergeCreateWorkflowInput,
    workflowContext?: WorkflowExecutionContext,
  ): Promise<CustomerMergeCreateWorkflowResult> {
    if (!workflowContext) {
      throw new Error("Workflow authorization context is required");
    }
    const result = await this.stepCreate(input);
    if (result.merge && result.userErrors.length === 0) {
      await this.stepStartProcess(input, result.merge.id, workflowContext);
    }
    return result;
  }

  @WorkflowStep()
  private stepCreate(input: CustomerMergeCreateWorkflowInput) {
    return this.kernel.runScript(
      CustomerMergeCreateScript,
      input.params,
      this.toScriptContext(input.context),
    );
  }

  private stepStartProcess(
    input: CustomerMergeCreateWorkflowInput,
    mergeId: string,
    workflowContext: WorkflowExecutionContext,
  ) {
    return this.broker.startWorkflow(
      "customers.customerMergeProcess",
      { mergeId, context: input.context },
      {
        source: "workflow",
        organizationId: input.context.organizationId,
        workflowId: DBOS.workflowID!,
        stepId: "startCustomerMergeProcess",
        callId: mergeId,
      },
      { workflowContext },
    );
  }
}

@Injectable()
export class CustomerDataRequestCreateWorkflow extends CustomerEntityCreateWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerDataRequestCreate")
  @Policy<CustomerDataRequestCreateWorkflowInput>({
    resource: "store.data",
    action: "admin",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(
    input: CustomerDataRequestCreateWorkflowInput,
  ): Promise<CustomerDataRequestCreateWorkflowResult> {
    const result = await this.stepCreate(input);
    if (result.dataRequest && result.userErrors.length === 0) {
      await this.stepStartProcess(input, result.dataRequest.id);
    }
    return result;
  }

  @WorkflowStep()
  private stepCreate(input: CustomerDataRequestCreateWorkflowInput) {
    return this.kernel.runScript(
      CustomerDataRequestCreateScript,
      input.params,
      this.toScriptContext(input.context),
    );
  }

  private stepStartProcess(input: CustomerDataRequestCreateWorkflowInput, dataRequestId: string) {
    return this.broker.startWorkflow(
      "customers.customerDataRequestProcess",
      { dataRequestId, context: input.context },
      {
        source: "workflow",
        organizationId: input.context.organizationId,
        workflowId: DBOS.workflowID!,
        stepId: "startCustomerDataRequestProcess",
        callId: dataRequestId,
      },
    );
  }
}
