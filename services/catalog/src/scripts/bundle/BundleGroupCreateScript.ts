import { BaseScript } from "../../kernel/BaseScript.js";
import type { BundleGroupCreateParams, BundleGroupResult } from "./dto/index.js";

export class BundleGroupCreateScript extends BaseScript<
  BundleGroupCreateParams,
  BundleGroupResult
> {
  protected async execute(params: BundleGroupCreateParams): Promise<BundleGroupResult> {
    // Validate title
    if (!params.title || params.title.trim() === "") {
      return {
        bundleGroup: undefined,
        userErrors: [
          { message: "Title is required", field: ["input", "title"], code: "REQUIRED" },
        ],
      };
    }

    // Validate minSelection/maxSelection relationship
    if (
      params.minSelection !== undefined &&
      params.maxSelection !== undefined &&
      params.minSelection !== null &&
      params.maxSelection !== null &&
      params.minSelection > params.maxSelection
    ) {
      return {
        bundleGroup: undefined,
        userErrors: [
          {
            message: "minSelection cannot be greater than maxSelection",
            field: ["input", "minSelection"],
            code: "INVALID",
          },
        ],
      };
    }

    // Get next sort index if not provided
    const sortIndex =
      params.sortIndex ??
      (await this.repository.bundleGroup.getMaxSortIndex(params.productId)) + 1;

    const bundleGroup = await this.repository.bundleGroup.create({
      productId: params.productId,
      title: params.title.trim(),
      sortIndex,
      minSelection: params.minSelection ?? null,
      maxSelection: params.maxSelection ?? null,
    });

    return { bundleGroup, userErrors: [] };
  }

  protected handleError(_error: unknown): BundleGroupResult {
    return {
      bundleGroup: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
