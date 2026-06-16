import { BaseScript } from "../../kernel/BaseScript.js";
import type { DeleteParams, DeleteResult } from "./dto/index.js";

export class ConditionGroupDeleteScript extends BaseScript<DeleteParams, DeleteResult> {
  protected async execute(params: DeleteParams): Promise<DeleteResult> {
    // Check if condition group exists
    const existing = await this.repository.conditionGroup.findById(params.id);
    if (!existing) {
      return {
        deletedId: undefined,
        userErrors: [
          { message: "Condition group not found", field: ["input", "id"], code: "NOT_FOUND" },
        ],
      };
    }

    // Delete the condition group (cascade will handle conditions)
    const deleted = await this.repository.conditionGroup.delete(params.id);
    if (!deleted) {
      return {
        deletedId: undefined,
        userErrors: [{ message: "Failed to delete condition group", code: "DELETE_FAILED" }],
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
