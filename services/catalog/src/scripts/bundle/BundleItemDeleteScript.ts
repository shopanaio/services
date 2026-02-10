import { BaseScript } from "../../kernel/BaseScript.js";
import type { DeleteParams, DeleteResult } from "./dto/index.js";

export class BundleItemDeleteScript extends BaseScript<DeleteParams, DeleteResult> {
  protected async execute(params: DeleteParams): Promise<DeleteResult> {
    // Check if bundle item exists
    const existing = await this.repository.bundleItem.findById(params.id);
    if (!existing) {
      return {
        deletedId: undefined,
        userErrors: [
          { message: "Bundle item not found", field: ["input", "id"], code: "NOT_FOUND" },
        ],
      };
    }

    // Delete the bundle item
    const deleted = await this.repository.bundleItem.delete(params.id);
    if (!deleted) {
      return {
        deletedId: undefined,
        userErrors: [{ message: "Failed to delete bundle item", code: "DELETE_FAILED" }],
      };
    }

    return { deletedId: params.id, userErrors: [] };
  }

  protected handleError(_error: unknown): DeleteResult {
    return {
      deletedId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
