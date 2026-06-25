import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import { GetInventoryItemProjectionSnapshotScript } from "../GetInventoryItemProjectionSnapshotScript.js";

export interface SyncInventoryItemCatalogProjectionParams {
  productId: string;
  variantIds?: string[];
  eventId?: string;
}

export interface SyncInventoryItemCatalogProjectionResult {
  success: boolean;
  userErrors: UserError[];
}

export class SyncInventoryItemCatalogProjectionScript extends BaseScript<
  SyncInventoryItemCatalogProjectionParams,
  SyncInventoryItemCatalogProjectionResult
> {
  protected async execute(
    params: SyncInventoryItemCatalogProjectionParams
  ): Promise<SyncInventoryItemCatalogProjectionResult> {
    const snapshotResult = await this.executeScript(
      GetInventoryItemProjectionSnapshotScript,
      {
        storeId: this.context.store.id,
        organizationId: this.context.store.organizationId,
        locale: this.getLocale(),
        userId: this.context.user?.id,
        requestId: this.context.requestId,
        productId: params.productId,
        variantIds: params.variantIds,
      }
    );

    if (!snapshotResult.ok) {
      return {
        success: false,
        userErrors: [
          {
            message: snapshotResult.message,
            code: snapshotResult.code,
          },
        ],
      };
    }

    await this.repository.inventoryItem.upsertCatalogProjectionSnapshot(
      snapshotResult.snapshot,
      params.eventId
    );

    return { success: true, userErrors: [] };
  }

  protected handleError(error: unknown): SyncInventoryItemCatalogProjectionResult {
    return {
      success: false,
      userErrors: [
        {
          message:
            error instanceof Error
              ? error.message
              : "Failed to sync inventory catalog projection.",
          code: "INVENTORY_CATALOG_PROJECTION_SYNC_FAILED",
        },
      ],
    };
  }
}
