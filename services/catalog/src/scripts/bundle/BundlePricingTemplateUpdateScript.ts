import { BaseScript } from "../../kernel/BaseScript.js";
import type { BundlePricingTemplateUpdateParams, BundlePricingTemplateResult } from "./dto/index.js";

const VALID_PRICE_TYPES = new Set(["BASE", "FREE", "FIXED", "PERCENT_OFF", "AMOUNT_OFF"]);

export class BundlePricingTemplateUpdateScript extends BaseScript<
  BundlePricingTemplateUpdateParams,
  BundlePricingTemplateResult
> {
  protected async execute(
    params: BundlePricingTemplateUpdateParams
  ): Promise<BundlePricingTemplateResult> {
    // Check if template exists
    const existing = await this.repository.bundlePricingTemplate.findById(params.id);
    if (!existing) {
      return {
        bundlePricingTemplate: undefined,
        userErrors: [
          { message: "Pricing template not found", field: ["input", "id"], code: "NOT_FOUND" },
        ],
      };
    }

    // Validate name if provided
    if (params.name !== undefined && params.name.trim() === "") {
      return {
        bundlePricingTemplate: undefined,
        userErrors: [
          { message: "Name cannot be empty", field: ["input", "name"], code: "INVALID" },
        ],
      };
    }

    // Validate price type if provided
    if (params.priceType && !VALID_PRICE_TYPES.has(params.priceType)) {
      return {
        bundlePricingTemplate: undefined,
        userErrors: [
          { message: "Invalid price type", field: ["input", "priceType"], code: "INVALID" },
        ],
      };
    }

    const bundlePricingTemplate = await this.repository.bundlePricingTemplate.update(
      params.id,
      {
        name: params.name?.trim(),
        priceType: params.priceType,
        priceValue: params.priceValue,
        sortIndex: params.sortIndex,
      }
    );

    return { bundlePricingTemplate: bundlePricingTemplate ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): BundlePricingTemplateResult {
    return {
      bundlePricingTemplate: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
