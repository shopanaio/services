import { BaseScript } from "../../kernel/BaseScript.js";
import type { DeleteParams, DeleteResult } from "./dto/index.js";

export class DependencyActionDeleteScript extends BaseScript<DeleteParams, DeleteResult> {
  protected async execute(params: DeleteParams): Promise<DeleteResult> {
    // Check if action exists
    const existing = await this.repository.dependencyAction.findById(params.id);
    if (!existing) {
      return {
        deletedId: undefined,
        userErrors: [
          { message: "Dependency action not found", field: ["input", "id"], code: "NOT_FOUND" },
        ],
      };
    }

    // Delete the action
    const deleted = await this.repository.dependencyAction.delete(params.id);
    if (!deleted) {
      return {
        deletedId: undefined,
        userErrors: [{ message: "Failed to delete dependency action", code: "DELETE_FAILED" }],
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
