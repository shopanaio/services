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
import { z } from "zod";
import { Kernel } from "../../kernel/Kernel.js";
import type { RunScriptContext } from "../../kernel/types.js";
import type { ProductCreateResult } from "./dto/ProductCreateDto.js";
import type { BackRefNotifyInput } from "../../sagas/index.js";
import { TransactionalStep } from "../CatalogTransactionalStep.js";
import { InventoryItemCreateScript, ProductCreateScript } from "./scripts/index.js";
import type { ProductCreateWorkflowInput } from "./dto/ProductCreateWorkflowInput.js";

const InventoryItemInputSchema = z
  .object({
    tracked: z.boolean(),
    requiresShipping: z.boolean(),
    sku: z.string().nullish(),
    continueSellingWhenOutOfStock: z.boolean().nullish(),
  })
  .refine(
    (data) => data.tracked || (data.sku == null && data.continueSellingWhenOutOfStock == null),
    { message: "Cannot provide inventory data when tracked is false" },
  );

@Injectable()
export class ProductCreateWorkflow extends BrokerWorkflows<
  ProductCreateWorkflowInput,
  ProductCreateResult
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

  @Workflow("productCreate")
  @Policy<ProductCreateWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(input: ProductCreateWorkflowInput): Promise<ProductCreateResult> {
    if (input.params.inventoryItem) {
      const validation = InventoryItemInputSchema.safeParse(input.params.inventoryItem);
      if (!validation.success)
        return {
          userErrors: validation.error.errors.map((error) => ({
            message: error.message,
            field: ["input", "inventoryItem"],
            code: "INVALID_INVENTORY_INPUT",
          })),
        };
    }
    const context: RunScriptContext = { ...input.context };
    return this.kernel.runWithWorkflowContext(context, async () => {
      const result = await this.createProduct(input, context);
      if (!result.product || result.userErrors.length > 0) return result;
      await this.emitProductCreated(input, result);
      if (result.productMedia) await this.syncMediaBackRefs(input, result.productMedia);
      return result;
    });
  }

  @TransactionalStep()
  private async createProduct(
    input: ProductCreateWorkflowInput,
    context: RunScriptContext,
  ): Promise<ProductCreateResult> {
    const result = await this.kernel.runScript(ProductCreateScript, input.params, context);
    if (!result.product || result.userErrors.length > 0) return result;
    for (const variant of result.product._variants ?? []) {
      const inventory = await this.kernel.runScript(
        InventoryItemCreateScript,
        {
          variantId: variant.id,
          trackInventory: input.params.inventoryItem?.tracked ?? false,
          requiresShipping: input.params.inventoryItem?.requiresShipping ?? false,
          sku: input.params.inventoryItem?.sku,
          continueSellingWhenOutOfStock:
            input.params.inventoryItem?.continueSellingWhenOutOfStock ?? undefined,
        },
        context,
      );
      if (inventory.userErrors.length > 0)
        throw new Error("Product inventory item creation failed");
    }
    return result;
  }

  @ChildWorkflowStep()
  private async emitProductCreated(
    input: ProductCreateWorkflowInput,
    result: ProductCreateResult,
  ): Promise<void> {
    const product = result.product!;
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "productCreated",
        payload: {
          productId: product.id,
          storeId: input.context.storeId,
          name: input.params.title,
          audit: productCreateAudit(product.id, input.context.storeId),
        },
        context: { organizationId: input.context.organizationId, userId: input.context.userId },
        subject: { type: "product", id: product.id },
        actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
        emitKey: `product:${product.id}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitProductCreated",
        callId: product.id,
        organizationId: input.context.organizationId,
      },
    );
  }

  @ChildWorkflowStep()
  private async syncMediaBackRefs(
    input: ProductCreateWorkflowInput,
    media: NonNullable<ProductCreateResult["productMedia"]>,
  ): Promise<void> {
    await this.broker.runSaga<unknown, BackRefNotifyInput>(
      "catalog.backRefNotify",
      {
        entityRef: { service: "catalog", entityType: "product", entityId: media.productId },
        storeId: input.context.storeId,
        fileIds: media.fileIds,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "syncProductMediaBackRefs",
        callId: media.productId,
        organizationId: input.context.organizationId,
      },
    );
  }
}
function productCreateAudit(productId: string, storeId: string) {
  return {
    kind: "aggregate-mutation" as const,
    schemaVersion: 1 as const,
    storeId,
    action: "CREATE" as const,
    command: "productCreate",
    aggregate: { type: "product", id: productId },
    operations: [
      {
        position: 0,
        type: "productCreate",
        action: "CREATE" as const,
        target: { type: "product", id: productId },
        changes: [],
      },
    ],
  };
}
