import { BaseScript } from "../../kernel/BaseScript.js";
import type { BundleGroupUpdateParams, BundleGroupResult } from "./dto/index.js";

export class BundleGroupUpdateScript extends BaseScript<
  BundleGroupUpdateParams,
  BundleGroupResult
> {
  protected async execute(params: BundleGroupUpdateParams): Promise<BundleGroupResult> {
    // Check if bundle group exists
    const existing = await this.repository.bundleGroup.findById(params.id);
    if (!existing) {
      return {
        bundleGroup: undefined,
        userErrors: [
          { message: "Bundle group not found", field: ["input", "id"], code: "NOT_FOUND" },
        ],
      };
    }

    // Validate title if provided
    if (params.title !== undefined && params.title.trim() === "") {
      return {
        bundleGroup: undefined,
        userErrors: [
          { message: "Title cannot be empty", field: ["input", "title"], code: "INVALID" },
        ],
      };
    }

    // Validate minSelection/maxSelection relationship
    const minSelection = params.minSelection ?? existing.minSelection;
    const maxSelection = params.maxSelection ?? existing.maxSelection;
    if (
      minSelection !== undefined &&
      maxSelection !== undefined &&
      minSelection !== null &&
      maxSelection !== null &&
      minSelection > maxSelection
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

    const bundleGroup = await this.repository.bundleGroup.update(params.id, {
      title: params.title?.trim(),
      sortIndex: params.sortIndex,
      minSelection: params.minSelection,
      maxSelection: params.maxSelection,
    });

    return { bundleGroup: bundleGroup ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): BundleGroupResult {
    return {
      bundleGroup: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
