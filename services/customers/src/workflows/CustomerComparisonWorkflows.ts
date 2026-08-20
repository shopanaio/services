import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  InjectBroker,
  type ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import {
  CustomerComparisonCategoryClearScript,
  CustomerComparisonVariantAddScript,
  CustomerComparisonVariantRemoveScript,
} from "../scripts/comparison/index.js";
import type {
  CustomerComparisonCategoryClearWorkflowInput,
  CustomerComparisonCategoryClearWorkflowResult,
  CustomerComparisonVariantAddWorkflowInput,
  CustomerComparisonVariantAddWorkflowResult,
  CustomerComparisonVariantRemoveWorkflowInput,
  CustomerComparisonVariantRemoveWorkflowResult,
  CustomerComparisonWorkflowContext,
} from "./dto/index.js";

abstract class CustomerComparisonWorkflow extends BrokerWorkflows {
  protected constructor(broker: ServiceBroker) {
    super(broker);
  }

  protected get kernel(): Kernel {
    return Kernel.getInstance();
  }

  protected scriptContext(context: CustomerComparisonWorkflowContext): RunScriptContext {
    return {
      organizationId: context.organizationId,
      storeId: context.storeId,
      locale: context.locale,
      requestId: context.requestId,
    };
  }
}

@Injectable()
export class CustomerComparisonVariantAddWorkflow extends CustomerComparisonWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerComparisonVariantAdd", {
    idempotencyStrategy: "client",
  })
  run(
    input: CustomerComparisonVariantAddWorkflowInput,
  ): Promise<CustomerComparisonVariantAddWorkflowResult> {
    return this.stepAdd(input);
  }

  @WorkflowStep()
  private stepAdd(input: CustomerComparisonVariantAddWorkflowInput) {
    return this.kernel.runScript(
      CustomerComparisonVariantAddScript,
      { ...input.params, customerId: input.context.customerId },
      this.scriptContext(input.context),
    );
  }
}

@Injectable()
export class CustomerComparisonVariantRemoveWorkflow extends CustomerComparisonWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerComparisonVariantRemove", {
    idempotencyStrategy: "client",
  })
  run(
    input: CustomerComparisonVariantRemoveWorkflowInput,
  ): Promise<CustomerComparisonVariantRemoveWorkflowResult> {
    return this.stepRemove(input);
  }

  @WorkflowStep()
  private stepRemove(input: CustomerComparisonVariantRemoveWorkflowInput) {
    return this.kernel.runScript(
      CustomerComparisonVariantRemoveScript,
      { ...input.params, customerId: input.context.customerId },
      this.scriptContext(input.context),
    );
  }
}

@Injectable()
export class CustomerComparisonCategoryClearWorkflow extends CustomerComparisonWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerComparisonCategoryClear", {
    idempotencyStrategy: "client",
  })
  run(
    input: CustomerComparisonCategoryClearWorkflowInput,
  ): Promise<CustomerComparisonCategoryClearWorkflowResult> {
    return this.stepClear(input);
  }

  @WorkflowStep()
  private stepClear(input: CustomerComparisonCategoryClearWorkflowInput) {
    return this.kernel.runScript(
      CustomerComparisonCategoryClearScript,
      { ...input.params, customerId: input.context.customerId },
      this.scriptContext(input.context),
    );
  }
}
