import { BaseScript } from "../../kernel/BaseScript.js";
import type { DependencyRuleUpdateParams, DependencyRuleResult } from "./dto/index.js";

const VALID_LOGIC_OPERATORS = new Set(["AND", "OR"]);

export class DependencyRuleUpdateScript extends BaseScript<
  DependencyRuleUpdateParams,
  DependencyRuleResult
> {
  protected async execute(params: DependencyRuleUpdateParams): Promise<DependencyRuleResult> {
    // Check if rule exists
    const existing = await this.repository.dependencyRule.findById(params.id);
    if (!existing) {
      return {
        dependencyRule: undefined,
        userErrors: [
          { message: "Dependency rule not found", field: ["input", "id"], code: "NOT_FOUND" },
        ],
      };
    }

    // Validate name if provided
    if (params.name !== undefined && params.name.trim() === "") {
      return {
        dependencyRule: undefined,
        userErrors: [
          { message: "Name cannot be empty", field: ["input", "name"], code: "INVALID" },
        ],
      };
    }

    // Validate logic operator if provided
    if (params.logicOperator && !VALID_LOGIC_OPERATORS.has(params.logicOperator)) {
      return {
        dependencyRule: undefined,
        userErrors: [
          {
            message: "Invalid logic operator",
            field: ["input", "logicOperator"],
            code: "INVALID",
          },
        ],
      };
    }

    const dependencyRule = await this.repository.dependencyRule.update(params.id, {
      name: params.name?.trim(),
      enabled: params.enabled,
      priority: params.priority,
      logicOperator: params.logicOperator,
    });

    return { dependencyRule: dependencyRule ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): DependencyRuleResult {
    return {
      dependencyRule: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
