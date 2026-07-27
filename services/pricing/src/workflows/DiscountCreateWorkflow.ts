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
import { DiscountCreateScript } from "../scripts/discount/DiscountCreateScript.js";
import type {
  DiscountCreateWorkflowInput,
  DiscountCreateWorkflowResult,
  PricingMutationWorkflowContext,
} from "./dto/index.js";

@Injectable()
export class DiscountCreateWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("pricing") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Workflow("discountCreate")
  @Policy<DiscountCreateWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(
    input: DiscountCreateWorkflowInput,
  ): Promise<DiscountCreateWorkflowResult> {
    const discountId = await this.stepGenerateDiscountId();
    const result = await this.stepCreate(discountId, input);
    return {
      discount: result.discount ?? null,
      userErrors: result.userErrors,
    };
  }

  @WorkflowStep()
  private async stepGenerateDiscountId(): Promise<string> {
    const [row] = await this.kernel.db.execute<{ id: string }>(
      sql`SELECT uuidv7() AS id`,
    );
    if (!row) throw new Error("Failed to generate discount ID");
    return row.id;
  }

  @WorkflowStep()
  private stepCreate(
    discountId: string,
    input: DiscountCreateWorkflowInput,
  ) {
    return this.kernel.runScript(
      DiscountCreateScript,
      {
        discountId,
        input: input.input,
        createdById: input.context.userId,
      },
      toScriptContext(input.context),
    );
  }
}

function toScriptContext(
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
