import { BaseScript } from "../../kernel/BaseScript.js";
import type { DeleteParams, DeleteResult } from "./dto/index.js";

export class BundlePricingTemplateDeleteScript extends BaseScript<DeleteParams, DeleteResult> {
  protected async execute(params: DeleteParams): Promise<DeleteResult> {
    // Check if template exists
    const existing = await this.repository.bundlePricingTemplate.findById(params.id);
    if (!existing) {
      return {
        deletedId: undefined,
        userErrors: [
          { message: "Pricing template not found", field: ["input", "id"], code: "NOT_FOUND" },
        ],
      };
    }

    // Delete the template
    const deleted = await this.repository.bundlePricingTemplate.delete(params.id);
    if (!deleted) {
      return {
        deletedId: undefined,
        userErrors: [
          { message: "Failed to delete pricing template", code: "DELETE_FAILED" },
        ],
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
