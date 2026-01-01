import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import type { Variant } from "../../repositories/models/index.js";

export interface VariantSetWeightParams {
  readonly variantId: string;
  readonly weight: {
    readonly value: number; // grams
  };
}

export interface VariantSetWeightResult {
  variant?: Variant;
  userErrors: UserError[];
}

export class VariantSetWeightScript extends BaseScript<VariantSetWeightParams, VariantSetWeightResult> {
  protected async execute(params: VariantSetWeightParams): Promise<VariantSetWeightResult> {
    const { variantId, weight } = params;

    const existingVariant = await this.repository.variant.findById(variantId);
    if (!existingVariant) {
      return {
        variant: undefined,
        userErrors: [{ message: "Variant not found", field: ["variantId"], code: "NOT_FOUND" }],
      };
    }

    if (weight.value <= 0) {
      return {
        variant: undefined,
        userErrors: [{ message: "Weight must be a positive value", field: ["weight", "value"], code: "INVALID_WEIGHT" }],
      };
    }

    await this.repository.physical.upsertWeight(variantId, {
      weightGr: weight.value,
    });

    this.logger.info({ variantId }, "Variant weight set successfully");

    return { variant: existingVariant, userErrors: [] };
  }

  protected handleError(_error: unknown): VariantSetWeightResult {
    return {
      variant: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
