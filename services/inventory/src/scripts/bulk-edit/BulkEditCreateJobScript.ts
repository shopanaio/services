import { v7 as uuidv7 } from "uuid";
import { BaseScript, type UserError, Transactional } from "../../kernel/BaseScript.js";
import type { BulkEditItem } from "../../repositories/models/index.js";

export interface FlatOperation {
  productId: string;
  variantId: string | null;
  opType: string;
  opIndex: number;
  params: unknown;
}

export interface BulkEditCreateJobParams {
  readonly operations: FlatOperation[];
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
    const { operations } = params;

    if (operations.length === 0) {
      return {
        userErrors: [{ message: "At least one operation required", code: "EMPTY_INPUT" }],
      };
    }

    if (operations.length > 500) {
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
    const productIds = [...new Set(operations.map((op) => op.productId))];

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

    // 6. Create items with chunk assignment
    const itemInputs = operations.map((op) => ({
      id: uuidv7(),
      jobId,
      productId: op.productId,
      variantId: op.variantId,
      opType: op.opType,
      opIndex: op.opIndex,
      chunkIndex: op.opIndex,
      params: op.params,
      fenceToken: fenceTokens.get(op.productId)!,
    }));

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
