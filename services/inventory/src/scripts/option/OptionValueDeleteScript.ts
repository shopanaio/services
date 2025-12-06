import { BaseScript, type UserError } from "../../kernel/BaseScript.js";

export interface OptionValueDeleteParams {
  readonly id: string;
}

export interface OptionValueDeleteResult {
  deletedId?: string;
  userErrors: UserError[];
}

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
