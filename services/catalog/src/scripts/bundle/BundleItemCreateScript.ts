import { BaseScript } from "../../kernel/BaseScript.js";
import type { BundleItemCreateParams, BundleItemResult } from "./dto/index.js";

const VALID_ITEM_TYPES = new Set(["PRODUCT", "VARIANT"]);
const VALID_PRICE_TYPES = new Set(["BASE", "FREE", "FIXED", "PERCENT_OFF", "AMOUNT_OFF"]);

export class BundleItemCreateScript extends BaseScript<
  BundleItemCreateParams,
  BundleItemResult
> {
  protected async execute(params: BundleItemCreateParams): Promise<BundleItemResult> {
    // Validate item type
    if (!VALID_ITEM_TYPES.has(params.itemType)) {
      return {
        bundleItem: undefined,
        userErrors: [
          { message: "Invalid item type", field: ["input", "itemType"], code: "INVALID" },
        ],
      };
    }

    // Check if group exists
    const group = await this.repository.bundleGroup.findById(params.groupId);
    if (!group) {
      return {
        bundleItem: undefined,
        userErrors: [
          { message: "Bundle group not found", field: ["input", "groupId"], code: "NOT_FOUND" },
        ],
      };
    }

    // Validate reference IDs based on item type
    if (params.itemType === "PRODUCT" && !params.refProductId) {
      return {
        bundleItem: undefined,
        userErrors: [
          {
            message: "refProductId is required for PRODUCT items",
            field: ["input", "refProductId"],
            code: "REQUIRED",
          },
        ],
      };
    }

    if (params.itemType === "VARIANT" && !params.refVariantId) {
      return {
        bundleItem: undefined,
        userErrors: [
          {
            message: "refVariantId is required for VARIANT items",
            field: ["input", "refVariantId"],
            code: "REQUIRED",
          },
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

    // Reject setting both priceType AND pricingTemplateId
    if (params.priceType && params.pricingTemplateId) {
      return {
        bundleItem: undefined,
        userErrors: [
          {
            message: "Cannot set both priceType and pricingTemplateId. Use one or the other.",
            field: ["input", "priceType"],
            code: "INVALID",
          },
        ],
      };
    }

    // Validate minQty/maxQty relationship
    const minQty = params.minQty ?? 1;
    const maxQty = params.maxQty;
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

    // Get next sort index if not provided
    const sortIndex =
      params.sortIndex ??
      (await this.repository.bundleItem.getMaxSortIndex(params.groupId)) + 1;

    const bundleItem = await this.repository.bundleItem.create({
      groupId: params.groupId,
      itemType: params.itemType,
      sortIndex,
      refProductId: params.refProductId ?? null,
      refVariantId: params.refVariantId ?? null,
      title: params.title ?? null,
      featuredImageId: params.featuredImageId ?? null,
      excludedVariantIds: params.excludedVariantIds ?? null,
      minQty: params.minQty ?? 1,
      maxQty: params.maxQty ?? null,
      defaultQty: params.defaultQty ?? 1,
      priceType: params.priceType ?? null,
      priceValue: params.priceValue ?? null,
      pricingTemplateId: params.pricingTemplateId ?? null,
      visible: params.visible ?? true,
      selected: params.selected ?? false,
    });

    return { bundleItem, userErrors: [] };
  }

  protected handleError(_error: unknown): BundleItemResult {
    return {
      bundleItem: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
