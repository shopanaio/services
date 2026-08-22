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
import { OptionCategoryDeleteScript } from "./scripts/index.js";
import type {
  ProductOptionCategoryDeleteInput,
  ProductOptionCategoryDeleteResult,
} from "./dto/index.js";

@Injectable()
export class ProductOptionCategoryDeleteWorkflow extends BrokerWorkflows<
  ProductOptionCategoryDeleteInput,
  ProductOptionCategoryDeleteResult
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

  @Workflow("productOptionCategoryDelete")
  @Policy<ProductOptionCategoryDeleteInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  run(input: ProductOptionCategoryDeleteInput): Promise<ProductOptionCategoryDeleteResult> {
    const context: RunScriptContext = { ...input.context };
    return this.kernel.runWithWorkflowContext(context, async () => {
      const result = await this.deleteProductOptionCategory(input, context);
      const deletedId = result.deletedCategoryId;
      if (!deletedId || result.userErrors.length > 0)
        return { deletedProductOptionCategoryId: null, userErrors: result.userErrors };
      await this.emitProductOptionCategoryDeleted(input);
      return { deletedProductOptionCategoryId: deletedId, userErrors: [] };
    });
  }

  @TransactionalStep()
  private deleteProductOptionCategory(
    input: ProductOptionCategoryDeleteInput,
    context: RunScriptContext,
  ) {
    return this.kernel.runScript(
      OptionCategoryDeleteScript,
      { id: input.productOptionCategoryId },
      context,
    );
  }

  @ChildWorkflowStep()
  private async emitProductOptionCategoryDeleted(
    input: ProductOptionCategoryDeleteInput,
  ): Promise<void> {
    const id = input.productOptionCategoryId;
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "productOptionCategoryDeleted",
        payload: {
          storeId: input.context.storeId,
          productOptionCategoryId: id,
          audit: {
            kind: "aggregate-mutation",
            schemaVersion: 1,
            storeId: input.context.storeId,
            action: "DELETE",
            command: "productOptionCategoryDelete",
            aggregate: { type: "productOptionCategory", id },
            operations: [
              {
                position: 0,
                type: "productOptionCategoryDelete",
                action: "DELETE",
                target: { type: "productOptionCategory", id },
                changes: [],
              },
            ],
          },
        },
        context: { organizationId: input.context.organizationId, userId: input.context.userId },
        subject: { type: "productOptionCategory", id },
        actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
        emitKey: `productOptionCategory:${id}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitProductOptionCategoryDeleted",
        callId: id,
        organizationId: input.context.organizationId,
      },
    );
  }
}
