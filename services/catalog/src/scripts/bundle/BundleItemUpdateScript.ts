import { BaseScript } from "../../kernel/BaseScript.js";
import type { BundleItemUpdateParams, BundleItemResult } from "./dto/index.js";

const VALID_PRICE_TYPES = new Set(["BASE", "FREE", "FIXED", "PERCENT_OFF", "AMOUNT_OFF"]);

export class BundleItemUpdateScript extends BaseScript<
  BundleItemUpdateParams,
  BundleItemResult
> {
  protected async execute(params: BundleItemUpdateParams): Promise<BundleItemResult> {
    // Check if bundle item exists
    const existing = await this.repository.bundleItem.findById(params.id);
    if (!existing) {
      return {
        bundleItem: undefined,
        userErrors: [
          { message: "Bundle item not found", field: ["input", "id"], code: "NOT_FOUND" },
        ],
      };
    }

    // Validate price type if provided
    if (params.priceType && !VALID_PRICE_TYPES.has(params.priceType)) {
      return {
        bundleItem: undefined,
        userErrors: [
          { message: "Invalid price type", field: ["input", "priceType"], code: "INVALID" },
        ],
      };
    }

    // Validate minQty/maxQty relationship
    const minQty = params.minQty ?? existing.minQty ?? 1;
    const maxQty = params.maxQty ?? existing.maxQty;
    if (maxQty !== undefined && maxQty !== null && minQty > maxQty) {
      return {
        bundleItem: undefined,
        userErrors: [
          {
            message: "minQty cannot be greater than maxQty",
            field: ["input", "minQty"],
            code: "INVALID",
          },
        ],
      };
    }

    const bundleItem = await this.repository.bundleItem.update(params.id, {
      title: params.title,
      featuredImageId: params.featuredImageId,
      excludedVariantIds: params.excludedVariantIds,
      minQty: params.minQty,
      maxQty: params.maxQty,
      defaultQty: params.defaultQty,
      priceType: params.priceType,
      priceValue: params.priceValue,
      pricingTemplateId: params.pricingTemplateId,
      visible: params.visible,
      selected: params.selected,
      sortIndex: params.sortIndex,
    });

    return { bundleItem: bundleItem ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): BundleItemResult {
    return {
      bundleItem: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
