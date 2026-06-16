import { BaseScript } from "../../kernel/BaseScript.js";
import type { ConditionGroupUpdateParams, ConditionGroupResult } from "./dto/index.js";

const VALID_LOGIC_OPERATORS = new Set(["AND", "OR"]);

export class ConditionGroupUpdateScript extends BaseScript<
  ConditionGroupUpdateParams,
  ConditionGroupResult
> {
  protected async execute(params: ConditionGroupUpdateParams): Promise<ConditionGroupResult> {
    // Check if condition group exists
    const existing = await this.repository.conditionGroup.findById(params.id);
    if (!existing) {
      return {
        conditionGroup: undefined,
        userErrors: [
          { message: "Condition group not found", field: ["input", "id"], code: "NOT_FOUND" },
        ],
      };
    }

    // Validate logic operator if provided
    if (params.logicOperator && !VALID_LOGIC_OPERATORS.has(params.logicOperator)) {
      return {
        conditionGroup: undefined,
        userErrors: [
          {
            message: "Invalid logic operator",
            field: ["input", "logicOperator"],
            code: "INVALID",
          },
        ],
      };
    }

    const conditionGroup = await this.repository.conditionGroup.update(params.id, {
      logicOperator: params.logicOperator,
      sortIndex: params.sortIndex,
    });

    return { conditionGroup: conditionGroup ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): ConditionGroupResult {
    return {
      conditionGroup: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
