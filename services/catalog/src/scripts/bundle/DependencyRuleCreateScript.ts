import { BaseScript } from "../../kernel/BaseScript.js";
import type { DependencyRuleCreateParams, DependencyRuleResult } from "./dto/index.js";

const VALID_LOGIC_OPERATORS = new Set(["AND", "OR"]);

export class DependencyRuleCreateScript extends BaseScript<
  DependencyRuleCreateParams,
  DependencyRuleResult
> {
  protected async execute(params: DependencyRuleCreateParams): Promise<DependencyRuleResult> {
    // Validate name
    if (!params.name || params.name.trim() === "") {
      return {
        dependencyRule: undefined,
        userErrors: [
          { message: "Name is required", field: ["input", "name"], code: "REQUIRED" },
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

    const dependencyRule = await this.repository.dependencyRule.create({
      productId: params.productId,
      name: params.name.trim(),
      enabled: params.enabled ?? true,
      priority: params.priority ?? 0,
      logicOperator: params.logicOperator ?? "AND",
    });

    return { dependencyRule, userErrors: [] };
  }

  protected handleError(_error: unknown): DependencyRuleResult {
    return {
      dependencyRule: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
