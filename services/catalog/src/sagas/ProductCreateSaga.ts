import { Injectable } from "@nestjs/common";
import {
  BrokerSaga,
  Saga,
  SagaStep,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import { DBOS } from "@dbos-inc/dbos-sdk";
import type { Media } from "@shopana/broker-types";
import { Kernel } from "../kernel/Kernel.js";
import { ProductCreateScript } from "../scripts/product/ProductCreateScript.js";
import type {
  ProductCreateParams,
  ProductCreateResult,
  VariantMediaEntry,
} from "../scripts/product/dto/index.js";
import type { RunScriptContext } from "../kernel/types.js";

export type { ProductCreateParams, ProductCreateResult };

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
    // Build context for script execution
    const ctx: RunScriptContext = {
      storeId: input.storeId,
      organizationId: input.organizationId,
      userId: input.userId,
    };

    // Step 1: Create product in database (transactional)
    const result = await this.createProduct(input, ctx);

    // If there are user errors, return early (no back-ref sync needed)
    if (result.userErrors.length > 0 || !result.product) {
      return result;
    }

    await this.emitProductCreated(result.product, input);

    // Step 2: Sync back-refs for variant media (only after successful DB commit)
    if (result.variantMediaMap && result.variantMediaMap.length > 0) {
      await this.syncVariantBackRefs(result.variantMediaMap);
    }

    return result;
  }

  @SagaStep()
  private async createProduct(input: ProductCreateParams, ctx: RunScriptContext): Promise<ProductCreateResult> {
    return this.kernel.runScript(ProductCreateScript, input, ctx);
  }

  @SagaStep()
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
  private async syncVariantBackRefs(variantMediaMap: VariantMediaEntry[]): Promise<void> {
    for (const entry of variantMediaMap) {
      try {
        await this.broker.call<Media.SyncEntityFilesResult, Media.SyncEntityFilesParams>(
          "media.syncEntityFiles",
          {
            entityRef: {
              service: "inventory",
              entityType: "variant",
              entityId: entry.variantId,
            },
            fileIds: entry.fileIds,
          },
        );

        this.logger.log(
          { variantId: entry.variantId, fileCount: entry.fileIds.length },
          "Synced variant media back-refs"
        );
      } catch (error) {
        // Log but don't fail the saga - back-refs are best-effort
        this.logger.warn(
          { variantId: entry.variantId, error },
          "Failed to sync variant media back-refs"
        );
      }
    }
  }
}
