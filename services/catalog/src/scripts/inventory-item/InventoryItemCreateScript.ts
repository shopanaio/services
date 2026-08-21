import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { InventoryItem } from "../../repositories/models/index.js";
import { successResult, unchangedResult, type ScriptResult } from "../types/ScriptResult.js";

export interface InventoryItemCreateParams {
  readonly variantId: string;
  readonly trackInventory: boolean;
  readonly requiresShipping: boolean;
  readonly sku?: string | null;
  readonly continueSellingWhenOutOfStock?: boolean;
}

export type InventoryItemCreateResult = ScriptResult<InventoryItem, Record<string, never>>;

/**
 * Local inventory-item write path for catalog workflows.
 *
 * This deliberately uses the repository transaction instead of the catalog
 * broker action so it joins the surrounding DBOS transactional step.
 */
export class InventoryItemCreateScript extends BaseScript<
  InventoryItemCreateParams,
  InventoryItemCreateResult
> {
  @Transactional()
  protected async execute(params: InventoryItemCreateParams): Promise<InventoryItemCreateResult> {
    const existing = await this.repository.inventoryItem.findByVariantId(params.variantId);
    const item = await this.repository.inventoryItem.upsertByVariantId(params.variantId, {
      sku: params.sku,
      trackInventory: params.trackInventory,
      requiresShipping: params.requiresShipping,
      continueSellingWhenOutOfStock: params.continueSellingWhenOutOfStock,
    });

    return existing ? unchangedResult(item) : successResult(item, {});
  }

  protected handleError(_error: unknown): InventoryItemCreateResult {
    return {
      result: null,
      changes: null,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
