import { BaseScript, Transactional } from "../../kernel/BaseScript.js";

export type CollectionProductSyncPageInput =
  | { action: "next"; operationId: string }
  | { action: "mark"; operationId: string; productIds: string[] };

export type CollectionProductSyncPageResult =
  | { action: "next"; productIds: string[]; completed: boolean }
  | { action: "mark"; productIds: string[] };

export class CollectionProductSyncPageScript extends BaseScript<
  CollectionProductSyncPageInput,
  CollectionProductSyncPageResult
> {
  @Transactional()
  protected async execute(
    input: CollectionProductSyncPageInput,
  ): Promise<CollectionProductSyncPageResult> {
    if (input.action === "mark") {
      await this.repository.collectionSync.markEmitted(
        input.operationId,
        input.productIds,
      );
      return { action: "mark", productIds: input.productIds };
    }
    const productIds =
      await this.repository.collectionSync.getPendingProductIds(
        input.operationId,
        null,
        100,
      );
    const completed =
      productIds.length === 0
        ? await this.repository.collectionSync.completeIfDrained(
            input.operationId,
          )
        : false;
    return { action: "next", productIds, completed };
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}
