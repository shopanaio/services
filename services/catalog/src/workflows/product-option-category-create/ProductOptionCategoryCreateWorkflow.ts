import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  ChildWorkflowStep,
  DBOS,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
} from "@shopana/shared-kernel";
import { Kernel } from "../../kernel/Kernel.js";
import type { RunScriptContext } from "../../kernel/types.js";
import { TransactionalStep } from "../CatalogTransactionalStep.js";
import { OptionCategoryCreateScript } from "./scripts/index.js";
import type {
  ProductOptionCategoryCreateInput,
  ProductOptionCategoryCreateResult,
} from "./dto/index.js";

@Injectable()
export class ProductOptionCategoryCreateWorkflow extends BrokerWorkflows<
  ProductOptionCategoryCreateInput,
  ProductOptionCategoryCreateResult
> {
  constructor(
    @InjectBroker("catalog") broker: ServiceBroker,
    private readonly kernel: Kernel,
  ) {
    super(broker);
  }
  get transactionKernel(): Kernel {
    return this.kernel;
  }

  @Workflow("productOptionCategoryCreate")
  @Policy<ProductOptionCategoryCreateInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  run(input: ProductOptionCategoryCreateInput): Promise<ProductOptionCategoryCreateResult> {
    const context: RunScriptContext = { ...input.context };
    return this.kernel.runWithWorkflowContext(context, async () => {
      const result = await this.createProductOptionCategory(input, context);
      const entity = result.category;
      if (!entity || result.userErrors.length > 0)
        return { productOptionCategory: null, userErrors: result.userErrors };
      await this.emitProductOptionCategoryCreated(input, entity.id);
      return { productOptionCategory: { id: entity.id }, userErrors: [] };
    });
  }

  @TransactionalStep()
  private createProductOptionCategory(
    input: ProductOptionCategoryCreateInput,
    context: RunScriptContext,
  ) {
    return this.kernel.runScript(
      OptionCategoryCreateScript,
      { name: input.name, slug: input.slug },
      context,
    );
  }

  @ChildWorkflowStep()
  private async emitProductOptionCategoryCreated(
    input: ProductOptionCategoryCreateInput,
    productOptionCategoryId: string,
  ): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "productOptionCategoryCreated",
        payload: {
          storeId: input.context.storeId,
          productOptionCategoryId,
          audit: {
            kind: "aggregate-mutation",
            schemaVersion: 1,
            storeId: input.context.storeId,
            action: "CREATE",
            command: "productOptionCategoryCreate",
            aggregate: { type: "productOptionCategory", id: productOptionCategoryId },
            operations: [
              {
                position: 0,
                type: "productOptionCategoryCreate",
                action: "CREATE",
                target: { type: "productOptionCategory", id: productOptionCategoryId },
                changes: [],
              },
            ],
          },
        },
        context: { organizationId: input.context.organizationId, userId: input.context.userId },
        subject: { type: "productOptionCategory", id: productOptionCategoryId },
        actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
        emitKey: `productOptionCategory:${productOptionCategoryId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitProductOptionCategoryCreated",
        callId: productOptionCategoryId,
        organizationId: input.context.organizationId,
      },
    );
  }
}
