import { BaseScript } from "../../kernel/BaseScript.js";
import { SyncProductIndexScript } from "./SyncProductIndexScript.js";

export interface RebuildProductIndexParams {
  batchSize?: number;
}

export interface RebuildProductIndexResult {
  total: number;
  synced: number;
}

export class RebuildProductIndexScript extends BaseScript<
  RebuildProductIndexParams,
  RebuildProductIndexResult
> {
  protected async execute(
    params: RebuildProductIndexParams
  ): Promise<RebuildProductIndexResult> {
    const batchSize = Math.min(Math.max(params.batchSize ?? 200, 1), 1000);
    let offset = 0;
    let total = 0;
    let synced = 0;

    while (true) {
      const products = await this.repository.product.getMany({
        limit: batchSize,
        offset,
      });

      if (products.length === 0) {
        break;
      }

      for (const product of products) {
        total += 1;
        const result = await this.executeScript(SyncProductIndexScript, {
          productId: product.id,
        });
        if (result.synced) {
          synced += 1;
        }
      }

      offset += batchSize;
    }

    return { total, synced };
  }

  protected handleError(_error: unknown): RebuildProductIndexResult {
    return { total: 0, synced: 0 };
  }
}
