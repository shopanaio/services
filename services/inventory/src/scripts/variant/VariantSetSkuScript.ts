import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import type { Variant } from "../../repositories/models/index.js";

export interface VariantSetSkuParams {
  readonly variantId: string;
  readonly sku: string;
}

export interface VariantSetSkuResult {
  variant?: Variant;
  userErrors: UserError[];
}

export class VariantSetSkuScript extends BaseScript<VariantSetSkuParams, VariantSetSkuResult> {
  protected async execute(params: VariantSetSkuParams): Promise<VariantSetSkuResult> {
    const { variantId, sku } = params;

    const existingVariant = await this.repository.variant.findById(variantId);
    if (!existingVariant) {
      return {
        variant: undefined,
        userErrors: [{ message: "Variant not found", field: ["variantId"], code: "NOT_FOUND" }],
      };
    }

    const variantWithSku = await this.repository.variant.findBySku(sku);
    if (variantWithSku && variantWithSku.id !== variantId) {
      return {
        variant: undefined,
        userErrors: [{ message: `SKU "${sku}" is already in use`, field: ["sku"], code: "SKU_ALREADY_EXISTS" }],
      };
    }

    const variant = await this.repository.variant.update(variantId, { sku });
    if (!variant) {
      return {
        variant: undefined,
        userErrors: [{ message: "Failed to update SKU", code: "UPDATE_FAILED" }],
      };
    }

    this.logger.info({ variantId, sku }, "Variant SKU updated successfully");

    return { variant, userErrors: [] };
  }

  protected handleError(_error: unknown): VariantSetSkuResult {
    return {
      variant: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
