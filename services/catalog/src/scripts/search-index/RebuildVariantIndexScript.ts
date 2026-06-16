import { BaseScript } from "../../kernel/BaseScript.js";
import { SyncVariantIndexScript } from "./SyncVariantIndexScript.js";

export interface RebuildVariantIndexParams {
  batchSize?: number;
}

export interface RebuildVariantIndexResult {
  products: number;
  syncedVariants: number;
}

export class RebuildVariantIndexScript extends BaseScript<
  RebuildVariantIndexParams,
  RebuildVariantIndexResult
> {
  protected async execute(
    params: RebuildVariantIndexParams
  ): Promise<RebuildVariantIndexResult> {
    const batchSize = Math.min(Math.max(params.batchSize ?? 200, 1), 1000);
    let offset = 0;
    let products = 0;
    let syncedVariants = 0;

    while (true) {
      const batch = await this.repository.product.getMany({
        limit: batchSize,
        offset,
      });
      if (batch.length === 0) {
        break;
      }

      for (const product of batch) {
        products += 1;
        const result = await this.executeScript(SyncVariantIndexScript, {
          productId: product.id,
        });
        syncedVariants += result.syncedVariants.length;
      }

      offset += batchSize;
    }

    return { products, syncedVariants };
  }

  protected handleError(_error: unknown): RebuildVariantIndexResult {
    return { products: 0, syncedVariants: 0 };
  }
}
