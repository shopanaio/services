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
  CustomerAddressCreateScript,
  CustomerConsentCreateScript,
  CustomerDataRequestCreateScript,
  CustomerGroupCreateScript,
  CustomerMergeCreateScript,
  CustomerSegmentCreateScript,
  CustomerTagCreateScript,
  CustomerTaxExemptionCreateScript,
  CustomerTaxIdentifierCreateScript,
} from "../scripts/index.js";
import type {
  CustomerAddressCreateWorkflowInput,
  CustomerAddressCreateWorkflowResult,
  CustomerConsentCreateWorkflowInput,
  CustomerConsentCreateWorkflowResult,
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
  CustomerTaxExemptionCreateWorkflowInput,
  CustomerTaxExemptionCreateWorkflowResult,
  CustomerTaxIdentifierCreateWorkflowInput,
  CustomerTaxIdentifierCreateWorkflowResult,
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

  protected async emitCustomerUpdated(
    context: CustomerMutationWorkflowContext,
    customerId: string,
    reason: CustomerUpdatedReason
  ): Promise<void> {
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

@Injectable()
export class CustomerAddressCreateWorkflow extends CustomerEntityCreateWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerAddressCreate")
  async run(
    input: CustomerAddressCreateWorkflowInput
  ): Promise<CustomerAddressCreateWorkflowResult> {
    const result = await this.stepCreate(input);
    if (result.address && result.userErrors.length === 0) {
      await this.emitCustomerUpdated(
        input.context,
        input.params.customerId,
        "address"
      );
    }
    return result;
  }

  @WorkflowStep()
  private stepCreate(input: CustomerAddressCreateWorkflowInput) {
    return this.kernel.runScript(
      CustomerAddressCreateScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }
}

@Injectable()
export class CustomerTaxIdentifierCreateWorkflow extends CustomerEntityCreateWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerTaxIdentifierCreate")
  async run(
    input: CustomerTaxIdentifierCreateWorkflowInput
  ): Promise<CustomerTaxIdentifierCreateWorkflowResult> {
    const result = await this.stepCreate(input);
    if (result.taxIdentifier && result.userErrors.length === 0) {
      await this.emitCustomerUpdated(
        input.context,
        input.params.customerId,
        "taxIdentifier"
      );
    }
    return result;
  }

  @WorkflowStep()
  private stepCreate(input: CustomerTaxIdentifierCreateWorkflowInput) {
    return this.kernel.runScript(
      CustomerTaxIdentifierCreateScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }
}

@Injectable()
export class CustomerTaxExemptionCreateWorkflow extends CustomerEntityCreateWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerTaxExemptionCreate")
  async run(
    input: CustomerTaxExemptionCreateWorkflowInput
  ): Promise<CustomerTaxExemptionCreateWorkflowResult> {
    const result = await this.stepCreate(input);
    if (result.taxExemption && result.userErrors.length === 0) {
      await this.emitCustomerUpdated(
        input.context,
        input.params.customerId,
        "taxExemption"
      );
    }
    return result;
  }

  @WorkflowStep()
  private stepCreate(input: CustomerTaxExemptionCreateWorkflowInput) {
    return this.kernel.runScript(
      CustomerTaxExemptionCreateScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }
}

@Injectable()
export class CustomerConsentCreateWorkflow extends CustomerEntityCreateWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerConsentCreate")
  async run(
    input: CustomerConsentCreateWorkflowInput
  ): Promise<CustomerConsentCreateWorkflowResult> {
    const result = await this.stepCreate(input);
    if (result.consent && result.event && result.userErrors.length === 0) {
      await this.emitCustomerUpdated(
        input.context,
        input.params.customerId,
        "consent"
      );
    }
    return result;
  }

  @WorkflowStep()
  private stepCreate(input: CustomerConsentCreateWorkflowInput) {
    return this.kernel.runScript(
      CustomerConsentCreateScript,
      input.params,
      this.toScriptContext(input.context)
    );
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
