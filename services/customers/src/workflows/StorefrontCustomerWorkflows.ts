import { Injectable } from "@nestjs/common";
import type { CustomerUpdatedReason } from "@shopana/events";
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
  StorefrontCustomerAddressCreateScript,
  StorefrontCustomerAddressDefaultSetScript,
  StorefrontCustomerAddressDeleteScript,
  StorefrontCustomerAddressUpdateScript,
  StorefrontCustomerDataRequestCancelScript,
  StorefrontCustomerDataRequestCreateScript,
  StorefrontCustomerMarketingConsentUpdateScript,
  StorefrontCustomerTaxIdentifierCreateScript,
  StorefrontCustomerTaxIdentifierDeleteScript,
  StorefrontCustomerTaxIdentifierUpdateScript,
  StorefrontCustomerUpdateScript,
  type StorefrontCustomerMutationResult,
} from "../scripts/storefront/index.js";
import type {
  StorefrontCustomerAddressCreateWorkflowInput,
  StorefrontCustomerAddressCreateWorkflowResult,
  StorefrontCustomerAddressDefaultSetWorkflowInput,
  StorefrontCustomerAddressDefaultSetWorkflowResult,
  StorefrontCustomerAddressDeleteWorkflowInput,
  StorefrontCustomerAddressDeleteWorkflowResult,
  StorefrontCustomerAddressUpdateWorkflowInput,
  StorefrontCustomerAddressUpdateWorkflowResult,
  StorefrontCustomerDataRequestCancelWorkflowInput,
  StorefrontCustomerDataRequestCancelWorkflowResult,
  StorefrontCustomerDataRequestCreateWorkflowInput,
  StorefrontCustomerDataRequestCreateWorkflowResult,
  StorefrontCustomerMarketingConsentUpdateWorkflowInput,
  StorefrontCustomerMarketingConsentUpdateWorkflowResult,
  StorefrontCustomerTaxIdentifierCreateWorkflowInput,
  StorefrontCustomerTaxIdentifierCreateWorkflowResult,
  StorefrontCustomerTaxIdentifierDeleteWorkflowInput,
  StorefrontCustomerTaxIdentifierDeleteWorkflowResult,
  StorefrontCustomerTaxIdentifierUpdateWorkflowInput,
  StorefrontCustomerTaxIdentifierUpdateWorkflowResult,
  StorefrontCustomerUpdateWorkflowInput,
  StorefrontCustomerUpdateWorkflowResult,
  StorefrontCustomerWorkflowContext,
} from "./dto/index.js";

abstract class StorefrontCustomerWorkflow extends BrokerWorkflows {
  protected constructor(broker: ServiceBroker) {
    super(broker);
  }

  protected get kernel(): Kernel {
    return Kernel.getInstance();
  }

  protected scriptContext(
    context: StorefrontCustomerWorkflowContext
  ): RunScriptContext {
    return {
      organizationId: context.organizationId,
      storeId: context.storeId,
      locale: context.locale,
      locales: context.locales,
      requestId: context.requestId,
    };
  }

  protected async emitCustomerUpdated(
    context: StorefrontCustomerWorkflowContext,
    result: StorefrontCustomerMutationResult
  ): Promise<void> {
    if (
      !result.customer ||
      result.userErrors.length > 0 ||
      result.updatedReasons.length === 0
    ) {
      return;
    }
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "customerUpdated",
        payload: {
          customerId: result.customer.id,
          storeId: context.storeId,
          reasons: result.updatedReasons,
        },
        context: { organizationId: context.organizationId },
        subject: { type: "customer", id: result.customer.id },
        actor: { type: "service", id: "customers-storefront" },
        emitKey: `customer:${result.customer.id}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: `emitCustomerUpdated:${reasonKey(result.updatedReasons)}`,
        callId: result.customer.id,
      }
    );
  }
}

@Injectable()
export class StorefrontCustomerUpdateWorkflow extends StorefrontCustomerWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("storefrontCustomerUpdate", { idempotencyStrategy: "client" })
  async run(
    input: StorefrontCustomerUpdateWorkflowInput
  ): Promise<StorefrontCustomerUpdateWorkflowResult> {
    const result = await this.stepUpdate(input);
    await this.emitCustomerUpdated(input.context, result);
    return result;
  }

  @WorkflowStep()
  private stepUpdate(input: StorefrontCustomerUpdateWorkflowInput) {
    return this.kernel.runScript(
      StorefrontCustomerUpdateScript,
      { ...input.params, customerId: input.context.customerId },
      this.scriptContext(input.context)
    );
  }
}

@Injectable()
export class StorefrontCustomerAddressCreateWorkflow extends StorefrontCustomerWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("storefrontCustomerAddressCreate", { idempotencyStrategy: "client" })
  async run(
    input: StorefrontCustomerAddressCreateWorkflowInput
  ): Promise<StorefrontCustomerAddressCreateWorkflowResult> {
    const result = await this.stepCreate(input);
    await this.emitCustomerUpdated(input.context, result);
    return result;
  }

  @WorkflowStep()
  private stepCreate(input: StorefrontCustomerAddressCreateWorkflowInput) {
    return this.kernel.runScript(
      StorefrontCustomerAddressCreateScript,
      { ...input.params, customerId: input.context.customerId },
      this.scriptContext(input.context)
    );
  }
}

@Injectable()
export class StorefrontCustomerAddressUpdateWorkflow extends StorefrontCustomerWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("storefrontCustomerAddressUpdate", { idempotencyStrategy: "client" })
  async run(
    input: StorefrontCustomerAddressUpdateWorkflowInput
  ): Promise<StorefrontCustomerAddressUpdateWorkflowResult> {
    const result = await this.stepUpdate(input);
    await this.emitCustomerUpdated(input.context, result);
    return result;
  }

  @WorkflowStep()
  private stepUpdate(input: StorefrontCustomerAddressUpdateWorkflowInput) {
    return this.kernel.runScript(
      StorefrontCustomerAddressUpdateScript,
      { ...input.params, customerId: input.context.customerId },
      this.scriptContext(input.context)
    );
  }
}

@Injectable()
export class StorefrontCustomerAddressDeleteWorkflow extends StorefrontCustomerWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("storefrontCustomerAddressDelete", { idempotencyStrategy: "client" })
  async run(
    input: StorefrontCustomerAddressDeleteWorkflowInput
  ): Promise<StorefrontCustomerAddressDeleteWorkflowResult> {
    const result = await this.stepDelete(input);
    await this.emitCustomerUpdated(input.context, result);
    return result;
  }

  @WorkflowStep()
  private stepDelete(input: StorefrontCustomerAddressDeleteWorkflowInput) {
    return this.kernel.runScript(
      StorefrontCustomerAddressDeleteScript,
      { ...input.params, customerId: input.context.customerId },
      this.scriptContext(input.context)
    );
  }
}

@Injectable()
export class StorefrontCustomerAddressDefaultSetWorkflow extends StorefrontCustomerWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("storefrontCustomerAddressDefaultSet", { idempotencyStrategy: "client" })
  async run(
    input: StorefrontCustomerAddressDefaultSetWorkflowInput
  ): Promise<StorefrontCustomerAddressDefaultSetWorkflowResult> {
    const result = await this.stepSet(input);
    await this.emitCustomerUpdated(input.context, result);
    return result;
  }

  @WorkflowStep()
  private stepSet(input: StorefrontCustomerAddressDefaultSetWorkflowInput) {
    return this.kernel.runScript(
      StorefrontCustomerAddressDefaultSetScript,
      { ...input.params, customerId: input.context.customerId },
      this.scriptContext(input.context)
    );
  }
}

@Injectable()
export class StorefrontCustomerMarketingConsentUpdateWorkflow extends StorefrontCustomerWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("storefrontCustomerMarketingConsentUpdate", {
    idempotencyStrategy: "client",
  })
  async run(
    input: StorefrontCustomerMarketingConsentUpdateWorkflowInput
  ): Promise<StorefrontCustomerMarketingConsentUpdateWorkflowResult> {
    const result = await this.stepUpdate(input);
    await this.emitCustomerUpdated(input.context, result);
    return result;
  }

  @WorkflowStep()
  private stepUpdate(
    input: StorefrontCustomerMarketingConsentUpdateWorkflowInput
  ) {
    return this.kernel.runScript(
      StorefrontCustomerMarketingConsentUpdateScript,
      {
        ...input.params,
        customerId: input.context.customerId,
        requestId: input.context.requestId,
      },
      this.scriptContext(input.context)
    );
  }
}

@Injectable()
export class StorefrontCustomerDataRequestCreateWorkflow extends StorefrontCustomerWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("storefrontCustomerDataRequestCreate", { idempotencyStrategy: "client" })
  run(
    input: StorefrontCustomerDataRequestCreateWorkflowInput
  ): Promise<StorefrontCustomerDataRequestCreateWorkflowResult> {
    return this.stepCreate(input);
  }

  @WorkflowStep()
  private stepCreate(input: StorefrontCustomerDataRequestCreateWorkflowInput) {
    return this.kernel.runScript(
      StorefrontCustomerDataRequestCreateScript,
      { ...input.params, customerId: input.context.customerId },
      this.scriptContext(input.context)
    );
  }
}

@Injectable()
export class StorefrontCustomerDataRequestCancelWorkflow extends StorefrontCustomerWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("storefrontCustomerDataRequestCancel", { idempotencyStrategy: "client" })
  run(
    input: StorefrontCustomerDataRequestCancelWorkflowInput
  ): Promise<StorefrontCustomerDataRequestCancelWorkflowResult> {
    return this.stepCancel(input);
  }

  @WorkflowStep()
  private stepCancel(input: StorefrontCustomerDataRequestCancelWorkflowInput) {
    return this.kernel.runScript(
      StorefrontCustomerDataRequestCancelScript,
      { ...input.params, customerId: input.context.customerId },
      this.scriptContext(input.context)
    );
  }
}

@Injectable()
export class StorefrontCustomerTaxIdentifierCreateWorkflow extends StorefrontCustomerWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("storefrontCustomerTaxIdentifierCreate", { idempotencyStrategy: "client" })
  async run(
    input: StorefrontCustomerTaxIdentifierCreateWorkflowInput
  ): Promise<StorefrontCustomerTaxIdentifierCreateWorkflowResult> {
    const result = await this.stepCreate(input);
    await this.emitCustomerUpdated(input.context, result);
    return result;
  }

  @WorkflowStep()
  private stepCreate(
    input: StorefrontCustomerTaxIdentifierCreateWorkflowInput
  ) {
    return this.kernel.runScript(
      StorefrontCustomerTaxIdentifierCreateScript,
      { ...input.params, customerId: input.context.customerId },
      this.scriptContext(input.context)
    );
  }
}

@Injectable()
export class StorefrontCustomerTaxIdentifierUpdateWorkflow extends StorefrontCustomerWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("storefrontCustomerTaxIdentifierUpdate", { idempotencyStrategy: "client" })
  async run(
    input: StorefrontCustomerTaxIdentifierUpdateWorkflowInput
  ): Promise<StorefrontCustomerTaxIdentifierUpdateWorkflowResult> {
    const result = await this.stepUpdate(input);
    await this.emitCustomerUpdated(input.context, result);
    return result;
  }

  @WorkflowStep()
  private stepUpdate(
    input: StorefrontCustomerTaxIdentifierUpdateWorkflowInput
  ) {
    return this.kernel.runScript(
      StorefrontCustomerTaxIdentifierUpdateScript,
      { ...input.params, customerId: input.context.customerId },
      this.scriptContext(input.context)
    );
  }
}

@Injectable()
export class StorefrontCustomerTaxIdentifierDeleteWorkflow extends StorefrontCustomerWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("storefrontCustomerTaxIdentifierDelete", { idempotencyStrategy: "client" })
  async run(
    input: StorefrontCustomerTaxIdentifierDeleteWorkflowInput
  ): Promise<StorefrontCustomerTaxIdentifierDeleteWorkflowResult> {
    const result = await this.stepDelete(input);
    await this.emitCustomerUpdated(input.context, result);
    return result;
  }

  @WorkflowStep()
  private stepDelete(
    input: StorefrontCustomerTaxIdentifierDeleteWorkflowInput
  ) {
    return this.kernel.runScript(
      StorefrontCustomerTaxIdentifierDeleteScript,
      { ...input.params, customerId: input.context.customerId },
      this.scriptContext(input.context)
    );
  }
}

function reasonKey(reasons: readonly CustomerUpdatedReason[]): string {
  return [...reasons].sort().join("+");
}
