import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import type { Variant } from "../../repositories/models/index.js";

export interface VariantSetDimensionsParams {
  readonly variantId: string;
  readonly dimensions: {
    readonly width: number;  // mm
    readonly length: number; // mm
    readonly height: number; // mm
  };
}

export interface VariantSetDimensionsResult {
  variant?: Variant;
  userErrors: UserError[];
}

export class VariantSetDimensionsScript extends BaseScript<VariantSetDimensionsParams, VariantSetDimensionsResult> {
  protected async execute(params: VariantSetDimensionsParams): Promise<VariantSetDimensionsResult> {
    const { variantId, dimensions } = params;

    const existingVariant = await this.repository.variant.findById(variantId);
    if (!existingVariant) {
      return {
        variant: undefined,
        userErrors: [{ message: "Variant not found", field: ["variantId"], code: "NOT_FOUND" }],
      };
    }

    if (dimensions.width <= 0 || dimensions.length <= 0 || dimensions.height <= 0) {
      return {
        variant: undefined,
        userErrors: [{ message: "All dimensions must be positive values", field: ["dimensions"], code: "INVALID_DIMENSIONS" }],
      };
    }

    await this.repository.physical.upsertDimensions(variantId, {
      wMm: dimensions.width,
      lMm: dimensions.length,
      hMm: dimensions.height,
    });

    this.logger.info({ variantId }, "Variant dimensions set successfully");

    return { variant: existingVariant, userErrors: [] };
  }

  protected handleError(_error: unknown): VariantSetDimensionsResult {
    return {
      variant: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
