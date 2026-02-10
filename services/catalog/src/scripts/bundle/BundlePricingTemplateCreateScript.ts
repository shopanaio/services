import { BaseScript } from "../../kernel/BaseScript.js";
import type { BundlePricingTemplateCreateParams, BundlePricingTemplateResult } from "./dto/index.js";

const VALID_PRICE_TYPES = new Set(["BASE", "FREE", "FIXED", "PERCENT_OFF", "AMOUNT_OFF"]);

export class BundlePricingTemplateCreateScript extends BaseScript<
  BundlePricingTemplateCreateParams,
  BundlePricingTemplateResult
> {
  protected async execute(
    params: BundlePricingTemplateCreateParams
  ): Promise<BundlePricingTemplateResult> {
    // Validate name
    if (!params.name || params.name.trim() === "") {
      return {
        bundlePricingTemplate: undefined,
        userErrors: [
          { message: "Name is required", field: ["input", "name"], code: "REQUIRED" },
        ],
      };
    }

    // Validate price type
    if (!VALID_PRICE_TYPES.has(params.priceType)) {
      return {
        bundlePricingTemplate: undefined,
        userErrors: [
          { message: "Invalid price type", field: ["input", "priceType"], code: "INVALID" },
        ],
      };
    }

    // Validate priceValue is provided for types that need it
    if (
      (params.priceType === "FIXED" ||
        params.priceType === "PERCENT_OFF" ||
        params.priceType === "AMOUNT_OFF") &&
      (params.priceValue === undefined || params.priceValue === null)
    ) {
      return {
        bundlePricingTemplate: undefined,
        userErrors: [
          {
            message: `priceValue is required for ${params.priceType} type`,
            field: ["input", "priceValue"],
            code: "REQUIRED",
          },
        ],
      };
    }

    const bundlePricingTemplate = await this.repository.bundlePricingTemplate.create({
      productId: params.productId,
      name: params.name.trim(),
      priceType: params.priceType,
      priceValue: params.priceValue ?? null,
      sortIndex: params.sortIndex ?? 0,
    });

    return { bundlePricingTemplate, userErrors: [] };
  }

  protected handleError(_error: unknown): BundlePricingTemplateResult {
    return {
      bundlePricingTemplate: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
