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
  CustomerAddressDeleteScript,
  CustomerConsentDeleteScript,
  CustomerDataRequestDeleteScript,
  CustomerGroupDeleteScript,
  CustomerMergeDeleteScript,
  CustomerSegmentDeleteScript,
  CustomerTagDeleteScript,
  CustomerTaxExemptionDeleteScript,
  CustomerTaxIdentifierDeleteScript,
} from "../scripts/index.js";
import type {
  CustomerAddressDeleteWorkflowInput,
  CustomerAddressDeleteWorkflowResult,
  CustomerConsentDeleteWorkflowInput,
  CustomerConsentDeleteWorkflowResult,
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
  CustomerTaxExemptionDeleteWorkflowInput,
  CustomerTaxExemptionDeleteWorkflowResult,
  CustomerTaxIdentifierDeleteWorkflowInput,
  CustomerTaxIdentifierDeleteWorkflowResult,
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
export class CustomerAddressDeleteWorkflow extends CustomerEntityDeleteWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerAddressDelete")
  async run(
    input: CustomerAddressDeleteWorkflowInput
  ): Promise<CustomerAddressDeleteWorkflowResult> {
    const result = await this.stepDelete(input);
    if (
      result.deletedAddressId &&
      result.customerId &&
      result.userErrors.length === 0
    ) {
      await this.emitCustomerUpdated(input.context, result.customerId, "address");
    }
    return result;
  }

  @WorkflowStep()
  private stepDelete(input: CustomerAddressDeleteWorkflowInput) {
    return this.kernel.runScript(
      CustomerAddressDeleteScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }
}

@Injectable()
export class CustomerTaxIdentifierDeleteWorkflow extends CustomerEntityDeleteWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerTaxIdentifierDelete")
  async run(
    input: CustomerTaxIdentifierDeleteWorkflowInput
  ): Promise<CustomerTaxIdentifierDeleteWorkflowResult> {
    const result = await this.stepDelete(input);
    if (
      result.deletedTaxIdentifierId &&
      result.customerId &&
      result.userErrors.length === 0
    ) {
      await this.emitCustomerUpdated(
        input.context,
        result.customerId,
        "taxIdentifier"
      );
    }
    return result;
  }

  @WorkflowStep()
  private stepDelete(input: CustomerTaxIdentifierDeleteWorkflowInput) {
    return this.kernel.runScript(
      CustomerTaxIdentifierDeleteScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }
}

@Injectable()
export class CustomerTaxExemptionDeleteWorkflow extends CustomerEntityDeleteWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerTaxExemptionDelete")
  async run(
    input: CustomerTaxExemptionDeleteWorkflowInput
  ): Promise<CustomerTaxExemptionDeleteWorkflowResult> {
    const result = await this.stepDelete(input);
    if (
      result.deletedTaxExemptionId &&
      result.customerId &&
      result.userErrors.length === 0
    ) {
      await this.emitCustomerUpdated(
        input.context,
        result.customerId,
        "taxExemption"
      );
    }
    return result;
  }

  @WorkflowStep()
  private stepDelete(input: CustomerTaxExemptionDeleteWorkflowInput) {
    return this.kernel.runScript(
      CustomerTaxExemptionDeleteScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }
}

@Injectable()
export class CustomerConsentDeleteWorkflow extends CustomerEntityDeleteWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerConsentDelete")
  async run(
    input: CustomerConsentDeleteWorkflowInput
  ): Promise<CustomerConsentDeleteWorkflowResult> {
    const result = await this.stepDelete(input);
    if (
      result.deletedConsentId &&
      result.customerId &&
      result.userErrors.length === 0
    ) {
      await this.emitCustomerUpdated(input.context, result.customerId, "consent");
    }
    return result;
  }

  @WorkflowStep()
  private stepDelete(input: CustomerConsentDeleteWorkflowInput) {
    return this.kernel.runScript(
      CustomerConsentDeleteScript,
      input.params,
      this.toScriptContext(input.context)
    );
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
