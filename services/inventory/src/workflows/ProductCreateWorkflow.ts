import { DBOS } from "@shopana/workflows";
import { BaseWorkflow } from "./BaseWorkflow.js";
import { ProductCreateScript } from "../scripts/product/ProductCreateScript.js";
import type {
  ProductCreateParams,
  ProductCreateResult,
  VariantMediaEntry,
} from "../scripts/product/dto/index.js";

/**
 * Durable workflow for product creation.
 *
 * Ensures that:
 * 1. Product is created in DB (transactional)
 * 2. Media back-refs are synced ONLY after successful DB commit
 *
 * This prevents orphan back-refs if the product creation transaction fails.
 */
export class ProductCreateWorkflow extends BaseWorkflow {
  /**
   * Main workflow - orchestrates product creation
   */
  @DBOS.workflow()
  async run(input: ProductCreateParams): Promise<ProductCreateResult> {
    // Step 1: Create product in database (transactional)
    const result = await this.createProductInDb(input);

    // If there are user errors, return early (no back-ref sync needed)
    if (result.userErrors.length > 0 || !result.product) {
      return result;
    }

    // Step 2: Sync back-refs for variant media (only after successful DB commit)
    if (result.variantMediaMap && result.variantMediaMap.length > 0) {
      await this.syncVariantBackRefs(result.variantMediaMap);
    }

    return result;
  }

  /**
   * Step: Create product in database
   * Uses ProductCreateScript which handles the transaction internally
   */
  @DBOS.step()
  async createProductInDb(input: ProductCreateParams): Promise<ProductCreateResult> {
    return this.kernel.runScript(ProductCreateScript, input);
  }

  /**
   * Step: Sync back-refs for variant media
   * Called only after product is successfully created and committed
   */
  @DBOS.step()
  async syncVariantBackRefs(variantMediaMap: VariantMediaEntry[]): Promise<void> {
    for (const entry of variantMediaMap) {
      try {
        await this.broker.call("media.syncEntityFiles", {
          entityRef: {
            service: "inventory",
            entityType: "variant",
            entityId: entry.variantId,
          },
          fileIds: entry.fileIds,
        });

        this.logger.info(
          { variantId: entry.variantId, fileCount: entry.fileIds.length },
          "Synced variant media back-refs"
        );
      } catch (error) {
        // Log but don't fail the workflow - back-refs are best-effort
        this.logger.warn(
          { variantId: entry.variantId, error },
          "Failed to sync variant media back-refs"
        );
      }
    }
  }
}
