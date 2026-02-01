import { BaseScript } from "../../kernel/BaseScript.js";
import type { Variant } from "../../repositories/models/index.js";
import {
  type ScriptResult,
  successResult,
  unchangedResult,
  singleError,
} from "../types/ScriptResult.js";
import type { DimensionsChanges } from "../types/ProductChanges.js";

export interface VariantSetDimensionsParams {
  readonly variantId: string;
  readonly width: number; // mm
  readonly height: number; // mm
  readonly length: number; // mm
}

export type VariantSetDimensionsResult = ScriptResult<Variant, DimensionsChanges>;

/**
 * Script for setting variant dimensions.
 */
export class VariantSetDimensionsScript extends BaseScript<
  VariantSetDimensionsParams,
  VariantSetDimensionsResult
> {
  protected async execute(
    params: VariantSetDimensionsParams
  ): Promise<VariantSetDimensionsResult> {
    const { variantId, width, height, length } = params;

    // Validate variant exists
    const existingVariant = await this.repository.variant.findById(variantId);
    if (!existingVariant) {
      return singleError("Variant not found", "NOT_FOUND", ["variantId"]);
    }

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
      await this.repository.variant.getDimensionsByVariantIds([variantId]);
    const current = currentDimensions[0];

    const dimensionsChanged =
      width !== (current?.wMm ?? 0) ||
      height !== (current?.hMm ?? 0) ||
      length !== (current?.lMm ?? 0);

    if (!dimensionsChanged) {
      this.logger.debug({ variantId }, "No dimension changes detected");
      return unchangedResult(existingVariant);
    }

    // Update dimensions
    await this.repository.physical.upsertDimensions(variantId, {
      wMm: width,
      lMm: length,
      hMm: height,
    });

    const changes: DimensionsChanges = { width, height, length };

    this.logger.info(
      { variantId, width, height, length },
      "Variant dimensions set successfully"
    );

    return successResult(existingVariant, changes);
  }

  protected handleError(_error: unknown): VariantSetDimensionsResult {
    return {
      result: null,
      changes: null,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
