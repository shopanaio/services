import { v7 as uuidv7 } from "uuid";
import { BaseScript, type UserError, Transactional } from "../../kernel/BaseScript.js";
import type { BulkEditItem } from "../../repositories/models/index.js";
import type { ProductBulkUpdateItem } from "../../workflows/dto/BulkEditWorkflowDto.js";
import type { ProductUpdateOperation } from "../../workflows/dto/ProductUpdateWorkflowDto.js";

export interface BulkEditCreateJobParams {
  readonly products: ProductBulkUpdateItem[];
}

export interface BulkEditCreateJobResult {
  jobId?: string;
  items?: BulkEditItem[];
  userErrors: UserError[];
}

export class BulkEditCreateJobScript extends BaseScript<
  BulkEditCreateJobParams,
  BulkEditCreateJobResult
> {
  @Transactional()
  protected async execute(
    params: BulkEditCreateJobParams
  ): Promise<BulkEditCreateJobResult> {
    const { products } = params;

    if (products.length === 0) {
      return {
        userErrors: [{ message: "At least one product required", code: "EMPTY_INPUT" }],
      };
    }

    if (products.length > 100) {
      return {
        userErrors: [
          { message: "Maximum 100 products per request", code: "BATCH_LIMIT_EXCEEDED" },
        ],
      };
    }

    const totalOps = products.reduce((sum, p) => sum + p.operations.length, 0);
    if (totalOps > 500) {
      return {
        userErrors: [
          { message: "Total operations exceed limit of 500", code: "BATCH_LIMIT_EXCEEDED" },
        ],
      };
    }

    const jobId = uuidv7();

    // 1. Create job
    await this.repository.bulkEditJob.create({ id: jobId });

    // 2. Collect unique productIds
    const productIds = [...new Set(products.map((p) => p.productId))];

    // 3. Generate fence tokens (one per product)
    const fenceTokens = new Map<string, string>();
    for (const productId of productIds) {
      fenceTokens.set(productId, uuidv7());
    }

    // 4. Upsert fences (sorted to prevent deadlocks)
    await this.repository.bulkFence.upsertFences(
      productIds.map((productId) => ({
        productId,
        fenceToken: fenceTokens.get(productId)!,
        jobId,
      }))
    );

    // 5. Supersede active items for these products
    await this.repository.bulkEditItem.supersedeActiveItems(productIds, jobId);

    // 6. Create items - grouped by product (chunkIndex = product index)
    const itemInputs: Array<{
      id: string;
      jobId: string;
      productId: string;
      variantId: string | null;
      opType: string;
      opIndex: number;
      chunkIndex: number;
      params: unknown;
      fenceToken: string;
    }> = [];

    for (let productIndex = 0; productIndex < products.length; productIndex++) {
      const product = products[productIndex];
      const { productId, operations } = product;

      for (let opIndex = 0; opIndex < operations.length; opIndex++) {
        const op = operations[opIndex];
        const { opType, variantId } = getOperationMetadata(op);

        itemInputs.push({
          id: uuidv7(),
          jobId,
          productId,
          variantId,
          opType,
          opIndex,
          chunkIndex: productIndex, // Group by product
          params: op,
          fenceToken: fenceTokens.get(productId)!,
        });
      }
    }

    await this.repository.bulkEditItem.createMany(itemInputs);

    // 7. Load created items
    const items = await this.repository.bulkEditItem.findByJobId(jobId);

    this.logger.info({ jobId, itemCount: items.length }, "Bulk edit job created");

    return { jobId, items, userErrors: [] };
  }

  protected handleError(_error: unknown): BulkEditCreateJobResult {
    return {
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function getOperationMetadata(op: ProductUpdateOperation): {
  opType: string;
  variantId: string | null;
} {
  if (op.type === "productUpdate") {
    return { opType: "productUpdate", variantId: null };
  }
  return { opType: "variantUpdate", variantId: op.params.variantId };
}
