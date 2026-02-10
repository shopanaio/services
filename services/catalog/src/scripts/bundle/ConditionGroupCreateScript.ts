import { BaseScript } from "../../kernel/BaseScript.js";
import type { ConditionGroupCreateParams, ConditionGroupResult } from "./dto/index.js";

const VALID_LOGIC_OPERATORS = new Set(["AND", "OR"]);

export class ConditionGroupCreateScript extends BaseScript<
  ConditionGroupCreateParams,
  ConditionGroupResult
> {
  protected async execute(params: ConditionGroupCreateParams): Promise<ConditionGroupResult> {
    // Check if rule exists
    const rule = await this.repository.dependencyRule.findById(params.ruleId);
    if (!rule) {
      return {
        conditionGroup: undefined,
        userErrors: [
          { message: "Dependency rule not found", field: ["input", "ruleId"], code: "NOT_FOUND" },
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

    const conditionGroup = await this.repository.conditionGroup.create({
      ruleId: params.ruleId,
      logicOperator: params.logicOperator ?? "AND",
      sortIndex: params.sortIndex ?? 0,
    });

    return { conditionGroup, userErrors: [] };
  }

  protected handleError(_error: unknown): ConditionGroupResult {
    return {
      conditionGroup: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
