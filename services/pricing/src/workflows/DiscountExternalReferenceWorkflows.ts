import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { sql } from "drizzle-orm";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import {
  DiscountExternalReferenceCreateScript,
  DiscountExternalReferenceDeleteScript,
  DiscountExternalReferenceUpdateScript,
} from "../scripts/discount/DiscountExternalReferenceScripts.js";
import type {
  DiscountExternalReferenceCreateWorkflowInput,
  DiscountExternalReferenceCreateWorkflowResult,
  DiscountExternalReferenceDeleteWorkflowInput,
  DiscountExternalReferenceDeleteWorkflowResult,
  DiscountExternalReferenceUpdateWorkflowInput,
  DiscountExternalReferenceUpdateWorkflowResult,
  PricingMutationWorkflowContext,
} from "./dto/index.js";

abstract class DiscountExternalReferenceWorkflow extends BrokerWorkflows {
  protected constructor(broker: ServiceBroker) {
    super(broker);
  }

  protected get kernel(): Kernel {
    return Kernel.getInstance();
  }

  protected toScriptContext(
    context: PricingMutationWorkflowContext,
  ): RunScriptContext {
    return {
      storeId: context.storeId,
      organizationId: context.organizationId,
      locale: context.locale,
      defaultLocale: context.defaultLocale,
      defaultCurrency: context.defaultCurrency,
      locales: context.locales,
      currencies: context.currencies,
      userId: context.userId,
      requestId: context.requestId,
    };
  }
}

@Injectable()
export class DiscountExternalReferenceCreateWorkflow extends DiscountExternalReferenceWorkflow {
  constructor(@InjectBroker("pricing") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("discountExternalReferenceCreate")
  @Policy<DiscountExternalReferenceCreateWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(
    input: DiscountExternalReferenceCreateWorkflowInput,
  ): Promise<DiscountExternalReferenceCreateWorkflowResult> {
    const externalReferenceId = await this.stepGenerateExternalReferenceId();
    return this.stepCreate(externalReferenceId, input);
  }

  @WorkflowStep()
  private async stepGenerateExternalReferenceId(): Promise<string> {
    const [row] = await this.kernel.db.execute<{ id: string }>(
      sql`SELECT uuidv7() AS id`,
    );
    if (!row) throw new Error("Failed to generate external reference ID");
    return row.id;
  }

  @WorkflowStep()
  private stepCreate(
    externalReferenceId: string,
    input: DiscountExternalReferenceCreateWorkflowInput,
  ) {
    return this.kernel.runScript(
      DiscountExternalReferenceCreateScript,
      { ...input.params, externalReferenceId },
      this.toScriptContext(input.context),
    );
  }
}

@Injectable()
export class DiscountExternalReferenceUpdateWorkflow extends DiscountExternalReferenceWorkflow {
  constructor(@InjectBroker("pricing") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("discountExternalReferenceUpdate")
  @Policy<DiscountExternalReferenceUpdateWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(
    input: DiscountExternalReferenceUpdateWorkflowInput,
  ): Promise<DiscountExternalReferenceUpdateWorkflowResult> {
    const result = await this.stepUpdate(input);
    return {
      ...result,
      operationResults: [
        {
          type: "discountExternalReferenceUpdate",
          applied: result.userErrors.length === 0,
          errors: result.userErrors,
        },
      ],
    };
  }

  @WorkflowStep()
  private stepUpdate(input: DiscountExternalReferenceUpdateWorkflowInput) {
    return this.kernel.runScript(
      DiscountExternalReferenceUpdateScript,
      input.params,
      this.toScriptContext(input.context),
    );
  }
}

@Injectable()
export class DiscountExternalReferenceDeleteWorkflow extends DiscountExternalReferenceWorkflow {
  constructor(@InjectBroker("pricing") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("discountExternalReferenceDelete")
  @Policy<DiscountExternalReferenceDeleteWorkflowInput>({
    resource: "store.data",
    action: "admin",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(
    input: DiscountExternalReferenceDeleteWorkflowInput,
  ): Promise<DiscountExternalReferenceDeleteWorkflowResult> {
    return this.stepDelete(input);
  }

  @WorkflowStep()
  private stepDelete(input: DiscountExternalReferenceDeleteWorkflowInput) {
    return this.kernel.runScript(
      DiscountExternalReferenceDeleteScript,
      input.params,
      this.toScriptContext(input.context),
    );
  }
}
