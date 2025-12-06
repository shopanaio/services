import { BaseScript, type UserError } from "../../kernel/BaseScript.js";

export interface OptionDeleteParams {
  readonly id: string;
}

export interface OptionDeleteResult {
  deletedOptionId?: string;
  userErrors: UserError[];
}

export class OptionDeleteScript extends BaseScript<OptionDeleteParams, OptionDeleteResult> {
  protected async execute(params: OptionDeleteParams): Promise<OptionDeleteResult> {
    const { id } = params;

    // 1. Check if option exists
    const existingOption = await this.repository.option.findById(id);
    if (!existingOption) {
      return {
        deletedOptionId: undefined,
        userErrors: [{ message: "Option not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    // 2. Delete option (CASCADE will delete values, swatches, variant links, translations)
    const deleted = await this.repository.option.delete(id);
    if (!deleted) {
      return {
        deletedOptionId: undefined,
        userErrors: [{ message: "Failed to delete option", code: "DELETE_FAILED" }],
      };
    }

    this.logger.info({ optionId: id }, "Option deleted");

    return { deletedOptionId: id, userErrors: [] };
  }

  protected handleError(_error: unknown): OptionDeleteResult {
    return {
      deletedOptionId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
