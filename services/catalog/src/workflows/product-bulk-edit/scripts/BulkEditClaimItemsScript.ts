import { BaseScript, Transactional } from "../../../kernel/BaseScript.js";

export interface BulkEditClaimItemsParams {
  readonly itemIds: readonly string[];
}

export interface BulkEditClaimItemsResult {
  readonly claimedItemIds: readonly string[];
}

export class BulkEditClaimItemsScript extends BaseScript<
  BulkEditClaimItemsParams,
  BulkEditClaimItemsResult
> {
  @Transactional()
  protected async execute(params: BulkEditClaimItemsParams): Promise<BulkEditClaimItemsResult> {
    const claimedItemIds: string[] = [];
    for (const itemId of params.itemIds) {
      if ((await this.repository.bulkEditItem.tryMarkRunning(itemId)) > 0) {
        claimedItemIds.push(itemId);
      }
    }
    return { claimedItemIds };
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}
