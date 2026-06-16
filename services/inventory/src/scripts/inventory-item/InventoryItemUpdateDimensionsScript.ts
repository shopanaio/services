import { BaseScript } from "../../kernel/BaseScript.js";
import type { ItemDimensions } from "../../repositories/models/index.js";
import {
  type ScriptResult,
  successResult,
  unchangedResult,
  singleError,
} from "../types/ScriptResult.js";
import type { DimensionsChanges } from "../types/ProductChanges.js";

export interface InventoryItemUpdateDimensionsParams {
  readonly variantId: string;
  readonly width: number; // mm
  readonly height: number; // mm
  readonly length: number; // mm
}

export type InventoryItemUpdateDimensionsResult = ScriptResult<ItemDimensions, DimensionsChanges>;

/**
 * Script for updating inventory item dimensions.
 */
export class InventoryItemUpdateDimensionsScript extends BaseScript<
  InventoryItemUpdateDimensionsParams,
  InventoryItemUpdateDimensionsResult
> {
  protected async execute(
    params: InventoryItemUpdateDimensionsParams
  ): Promise<InventoryItemUpdateDimensionsResult> {
    const { variantId, width, height, length } = params;

    // Validate dimensions
    if (width <= 0) {
      return singleError(
        "Width must be a positive value",
        "INVALID_DIMENSION",
        ["width"]
      );
    }
    if (height <= 0) {
      return singleError(
        "Height must be a positive value",
        "INVALID_DIMENSION",
        ["height"]
      );
    }
    if (length <= 0) {
      return singleError(
        "Length must be a positive value",
        "INVALID_DIMENSION",
        ["length"]
      );
    }

    // Get current dimensions to compare
    const currentDimensions =
      await this.repository.physical.getDimensionsByVariantIds([variantId]);
    const current = currentDimensions[0];

    const dimensionsChanged =
      width !== (current?.wMm ?? 0) ||
      height !== (current?.hMm ?? 0) ||
      length !== (current?.lMm ?? 0);

    if (!dimensionsChanged && current) {
      this.logger.debug({ variantId }, "No dimension changes detected");
      return unchangedResult(current);
    }

    // Update dimensions
    const result = await this.repository.physical.upsertDimensions(variantId, {
      wMm: width,
      lMm: length,
      hMm: height,
    });

    const changes: DimensionsChanges = { width, height, length };

    this.logger.info(
      { variantId, width, height, length },
      "Inventory item dimensions updated successfully"
    );

    return successResult(result, changes);
  }

  protected handleError(_error: unknown): InventoryItemUpdateDimensionsResult {
    return {
      result: null,
      changes: null,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
