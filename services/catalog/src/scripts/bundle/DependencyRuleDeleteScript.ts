import { BaseScript } from "../../kernel/BaseScript.js";
import type { DeleteParams, DeleteResult } from "./dto/index.js";

export class DependencyRuleDeleteScript extends BaseScript<DeleteParams, DeleteResult> {
  protected async execute(params: DeleteParams): Promise<DeleteResult> {
    // Check if rule exists
    const existing = await this.repository.dependencyRule.findById(params.id);
    if (!existing) {
      return {
        deletedId: undefined,
        userErrors: [
          { message: "Dependency rule not found", field: ["input", "id"], code: "NOT_FOUND" },
        ],
      };
    }

    // Delete the rule (cascade will handle condition groups and actions)
    const deleted = await this.repository.dependencyRule.delete(params.id);
    if (!deleted) {
      return {
        deletedId: undefined,
        userErrors: [{ message: "Failed to delete dependency rule", code: "DELETE_FAILED" }],
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
