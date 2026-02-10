import { BaseScript } from "../../kernel/BaseScript.js";
import type { DeleteParams, DeleteResult } from "./dto/index.js";

export class BundleGroupDeleteScript extends BaseScript<DeleteParams, DeleteResult> {
  protected async execute(params: DeleteParams): Promise<DeleteResult> {
    // Check if bundle group exists
    const existing = await this.repository.bundleGroup.findById(params.id);
    if (!existing) {
      return {
        deletedId: undefined,
        userErrors: [
          { message: "Bundle group not found", field: ["input", "id"], code: "NOT_FOUND" },
        ],
      };
    }

    // Delete the bundle group (cascade will handle items)
    const deleted = await this.repository.bundleGroup.delete(params.id);
    if (!deleted) {
      return {
        deletedId: undefined,
        userErrors: [{ message: "Failed to delete bundle group", code: "DELETE_FAILED" }],
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
