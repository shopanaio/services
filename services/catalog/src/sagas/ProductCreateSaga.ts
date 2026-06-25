import { Injectable } from "@nestjs/common";
import {
  BrokerSaga,
  Saga,
  SagaStep,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import { DBOS } from "@dbos-inc/dbos-sdk";
import { z } from "zod";
import type { Media, Inventory } from "@shopana/broker-types";
import { Kernel } from "../kernel/Kernel.js";
import { ProductCreateScript } from "../scripts/product/ProductCreateScript.js";
import { SyncInventoryItemCatalogProjectionScript } from "../scripts/inventory-item/index.js";
import type {
  ProductCreateParams,
  ProductCreateResult,
  InventoryItemCreateInput,
  ProductMediaEntry,
} from "../scripts/product/dto/index.js";
import type { RunScriptContext } from "../kernel/types.js";

export type { ProductCreateParams, ProductCreateResult };

const InventoryItemInputSchema = z.object({
  tracked: z.boolean(),
  sku: z.string().nullish(),
  continueSellingWhenOutOfStock: z.boolean().nullish(),
}).refine(
  (data) => {
    if (!data.tracked && (data.sku != null || data.continueSellingWhenOutOfStock != null)) {
      return false;
    }
    return true;
  },
  { message: "Cannot provide inventory data (sku, continueSellingWhenOutOfStock) when tracked is false" }
);

/**
 * Saga for product creation.
 *
 * Ensures that:
 * 1. Product is created in DB (transactional)
 * 2. Media back-refs are synced ONLY after successful DB commit
 *
 * This prevents orphan back-refs if the product creation transaction fails.
 */
@Injectable()
export class ProductCreateSaga extends BrokerSaga<ProductCreateParams, ProductCreateResult> {
  constructor(@InjectBroker("catalog") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Saga("productCreate")
  async run(input: ProductCreateParams): Promise<ProductCreateResult> {
    // Validate inventory item input before any saga steps
    if (input.inventoryItem) {
      const validation = InventoryItemInputSchema.safeParse(input.inventoryItem);
      if (!validation.success) {
        return {
          userErrors: validation.error.errors.map((e) => ({
            message: e.message,
            code: "INVALID_INVENTORY_INPUT",
          })),
        };
      }
    }

    // Build context for script execution
    const ctx: RunScriptContext = {
      storeId: input.storeId,
      organizationId: input.organizationId,
      userId: input.userId,
    };

    // Step 1: Create product in database (transactional)
    const result = await this.createProduct(input, ctx);

    // If there are user errors, return early
    if (result.userErrors.length > 0 || !result.product) {
      return result;
    }

    // Step 2: Create inventory items for all variants
    const variants = result.product._variants ?? [];
    if (variants.length > 0) {
      await this.createInventoryItems(variants.map((v) => v.id), input.inventoryItem, input.storeId);
    }

    await this.syncInventoryCatalogProjection(result.product.id);

    // Child workflows cannot be started from a DBOS step. Emit after inventory
    // items exist so inventory list projection can immediately join them.
    await this.emitProductCreated(result.product, input);

    // Step 3: Sync product media back-refs (only after successful DB commit)
    if (result.productMedia) {
      await this.syncProductBackRefs(result.productMedia);
    }

    return result;
  }

  @SagaStep()
  private async createProduct(input: ProductCreateParams, ctx: RunScriptContext): Promise<ProductCreateResult> {
    return this.kernel.runScript(ProductCreateScript, input, ctx);
  }

  private async emitProductCreated(
    product: NonNullable<ProductCreateResult["product"]>,
    input: ProductCreateParams
  ): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "productCreated",
        payload: {
          productId: product.id,
          storeId: input.storeId,
          name: input.title,
        },
        source: "inventory",
        context: {
          tenantId: input.organizationId,
          userId: input.userId,
        },
        subject: { type: "product", id: product.id },
        actor: input.userId
          ? { type: "user", id: input.userId }
          : undefined,
        emitKey: `product:${product.id}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitProductCreated",
        callId: product.id,
      },
    );
  }

  @SagaStep()
  private async createInventoryItems(
    variantIds: string[],
    inventoryItem: InventoryItemCreateInput | undefined,
    storeId: string,
  ): Promise<void> {
    for (const variantId of variantIds) {
      await this.broker.call<Inventory.CreateItemResult, Inventory.CreateItemParams>(
        "inventory.createItem",
        {
          storeId,
          variantId,
          trackInventory: inventoryItem?.tracked ?? false,
          sku: inventoryItem?.sku ?? undefined,
          continueSellingWhenOutOfStock: inventoryItem?.continueSellingWhenOutOfStock ?? undefined,
        },
      );

      this.logger.log({ variantId }, "Created inventory item for variant");
    }
  }

  @SagaStep()
  private async syncInventoryCatalogProjection(productId: string): Promise<void> {
    const result = await this.kernel.runScript(
      SyncInventoryItemCatalogProjectionScript,
      { productId }
    );

    if (!result.success) {
      throw new Error(
        result.userErrors[0]?.message ?? "Failed to sync inventory catalog projection"
      );
    }
  }

  async compensateCreateInventoryItems(
    variantIds: string[],
    _inventoryItem: InventoryItemCreateInput | undefined,
    storeId: string,
  ): Promise<void> {
    for (const variantId of variantIds) {
      try {
        await this.broker.call<Inventory.DeleteItemByVariantIdResult, Inventory.DeleteItemByVariantIdParams>(
          "inventory.deleteItemByVariantId",
          { storeId, variantId },
        );
        this.logger.log({ variantId }, "Compensated: deleted inventory item");
      } catch (error) {
        this.logger.warn({ variantId, error }, "Failed to compensate inventory item");
      }
    }
  }

  @SagaStep()
  private async syncProductBackRefs(entry: ProductMediaEntry): Promise<void> {
    try {
      await this.broker.call<Media.SyncEntityFilesResult, Media.SyncEntityFilesParams>(
        "media.syncEntityFiles",
        {
          entityRef: {
            service: "catalog",
            entityType: "product",
            entityId: entry.productId,
          },
          fileIds: entry.fileIds,
        },
      );

      this.logger.log(
        { productId: entry.productId, fileCount: entry.fileIds.length },
        "Synced product media back-refs"
      );
    } catch (error) {
      // Log but don't fail the saga - back-refs are best-effort
      this.logger.warn(
        { productId: entry.productId, error },
        "Failed to sync product media back-refs"
      );
    }
  }
}
