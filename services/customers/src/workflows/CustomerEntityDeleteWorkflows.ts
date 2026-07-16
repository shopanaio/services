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
  CustomerDataRequestDeleteScript,
  CustomerGroupDeleteScript,
  CustomerMergeDeleteScript,
  CustomerSegmentDeleteScript,
  CustomerTagDeleteScript,
} from "../scripts/index.js";
import type {
  CustomerDataRequestDeleteWorkflowInput,
  CustomerDataRequestDeleteWorkflowResult,
  CustomerGroupDeleteWorkflowInput,
  CustomerGroupDeleteWorkflowResult,
  CustomerMergeDeleteWorkflowInput,
  CustomerMergeDeleteWorkflowResult,
  CustomerMutationWorkflowContext,
  CustomerSegmentDeleteWorkflowInput,
  CustomerSegmentDeleteWorkflowResult,
  CustomerTagDeleteWorkflowInput,
  CustomerTagDeleteWorkflowResult,
} from "./dto/index.js";

abstract class CustomerEntityDeleteWorkflow extends BrokerWorkflows {
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
export class CustomerGroupDeleteWorkflow extends CustomerEntityDeleteWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerGroupDelete")
  async run(
    input: CustomerGroupDeleteWorkflowInput
  ): Promise<CustomerGroupDeleteWorkflowResult> {
    return this.stepDelete(input);
  }

  @WorkflowStep()
  private stepDelete(input: CustomerGroupDeleteWorkflowInput) {
    return this.kernel.runScript(
      CustomerGroupDeleteScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }
}

@Injectable()
export class CustomerTagDeleteWorkflow extends CustomerEntityDeleteWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerTagDelete")
  async run(
    input: CustomerTagDeleteWorkflowInput
  ): Promise<CustomerTagDeleteWorkflowResult> {
    return this.stepDelete(input);
  }

  @WorkflowStep()
  private stepDelete(input: CustomerTagDeleteWorkflowInput) {
    return this.kernel.runScript(
      CustomerTagDeleteScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }
}

@Injectable()
export class CustomerSegmentDeleteWorkflow extends CustomerEntityDeleteWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerSegmentDelete")
  async run(
    input: CustomerSegmentDeleteWorkflowInput
  ): Promise<CustomerSegmentDeleteWorkflowResult> {
    return this.stepDelete(input);
  }

  @WorkflowStep()
  private stepDelete(input: CustomerSegmentDeleteWorkflowInput) {
    return this.kernel.runScript(
      CustomerSegmentDeleteScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }
}

@Injectable()
export class CustomerMergeDeleteWorkflow extends CustomerEntityDeleteWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerMergeDelete")
  async run(
    input: CustomerMergeDeleteWorkflowInput
  ): Promise<CustomerMergeDeleteWorkflowResult> {
    return this.stepDelete(input);
  }

  @WorkflowStep()
  private stepDelete(input: CustomerMergeDeleteWorkflowInput) {
    return this.kernel.runScript(
      CustomerMergeDeleteScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }
}

@Injectable()
export class CustomerDataRequestDeleteWorkflow extends CustomerEntityDeleteWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerDataRequestDelete")
  async run(
    input: CustomerDataRequestDeleteWorkflowInput
  ): Promise<CustomerDataRequestDeleteWorkflowResult> {
    return this.stepDelete(input);
  }

  @WorkflowStep()
  private stepDelete(input: CustomerDataRequestDeleteWorkflowInput) {
    return this.kernel.runScript(
      CustomerDataRequestDeleteScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }
}
