import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import { DiscountDeleteScript } from "../scripts/discount/DiscountDeleteScript.js";
import type {
  DiscountDeleteWorkflowInput,
  DiscountDeleteWorkflowResult,
  PricingMutationWorkflowContext,
} from "./dto/index.js";

@Injectable()
export class DiscountDeleteWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("pricing") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Workflow("discountDelete")
  @Policy<DiscountDeleteWorkflowInput>({
    resource: "store.data",
    action: "admin",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(input: DiscountDeleteWorkflowInput): Promise<DiscountDeleteWorkflowResult> {
    return this.stepDelete(input);
  }

  @WorkflowStep()
  private stepDelete(input: DiscountDeleteWorkflowInput) {
    return this.kernel.runScript(
      DiscountDeleteScript,
      {
        id: input.discountId,
      },
      toScriptContext(input.context),
    );
  }
}

function toScriptContext(context: PricingMutationWorkflowContext): RunScriptContext {
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
