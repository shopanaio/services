import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  InjectBroker,
  ServiceBroker,
  Workflow,
  WorkflowStep,
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

}

@Injectable()
export class CustomerGroupCreateWorkflow extends CustomerEntityCreateWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerGroupCreate")
  async run(
    input: CustomerGroupCreateWorkflowInput
  ): Promise<CustomerGroupCreateWorkflowResult> {
    return this.stepCreate(input);
  }

  @WorkflowStep()
  private stepCreate(input: CustomerGroupCreateWorkflowInput) {
    return this.kernel.runScript(
      CustomerGroupCreateScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }
}

@Injectable()
export class CustomerTagCreateWorkflow extends CustomerEntityCreateWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerTagCreate")
  async run(
    input: CustomerTagCreateWorkflowInput
  ): Promise<CustomerTagCreateWorkflowResult> {
    return this.stepCreate(input);
  }

  @WorkflowStep()
  private stepCreate(input: CustomerTagCreateWorkflowInput) {
    return this.kernel.runScript(
      CustomerTagCreateScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }
}

@Injectable()
export class CustomerSegmentCreateWorkflow extends CustomerEntityCreateWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerSegmentCreate")
  async run(
    input: CustomerSegmentCreateWorkflowInput
  ): Promise<CustomerSegmentCreateWorkflowResult> {
    return this.stepCreate(input);
  }

  @WorkflowStep()
  private stepCreate(input: CustomerSegmentCreateWorkflowInput) {
    return this.kernel.runScript(
      CustomerSegmentCreateScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }
}

@Injectable()
export class CustomerMergeCreateWorkflow extends CustomerEntityCreateWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerMergeCreate")
  async run(
    input: CustomerMergeCreateWorkflowInput
  ): Promise<CustomerMergeCreateWorkflowResult> {
    return this.stepCreate(input);
  }

  @WorkflowStep()
  private stepCreate(input: CustomerMergeCreateWorkflowInput) {
    return this.kernel.runScript(
      CustomerMergeCreateScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }
}

@Injectable()
export class CustomerDataRequestCreateWorkflow extends CustomerEntityCreateWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerDataRequestCreate")
  async run(
    input: CustomerDataRequestCreateWorkflowInput
  ): Promise<CustomerDataRequestCreateWorkflowResult> {
    return this.stepCreate(input);
  }

  @WorkflowStep()
  private stepCreate(input: CustomerDataRequestCreateWorkflowInput) {
    return this.kernel.runScript(
      CustomerDataRequestCreateScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }
}
