import { BaseScript } from "../../kernel/BaseScript.js";
import type { OptionValueDeleteParams, OptionValueDeleteResult } from "./dto/index.js";

export class OptionValueDeleteScript extends BaseScript<
  OptionValueDeleteParams,
  OptionValueDeleteResult
> {
  protected async execute(params: OptionValueDeleteParams): Promise<OptionValueDeleteResult> {
    const { id } = params;

    // 1. Check value exists
    const existingValue = await this.repository.option.findValueById(id);
    if (!existingValue) {
      return {
        deletedId: undefined,
        userErrors: [{ message: "Option value not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    // 2. Delete value
    await this.repository.option.deleteValue(id);

    return { deletedId: id, userErrors: [] };
  }

  protected handleError(_error: unknown): OptionValueDeleteResult {
    return {
      deletedId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

// Re-export types for backwards compatibility
export type { OptionValueDeleteParams, OptionValueDeleteResult } from "./dto/index.js";
