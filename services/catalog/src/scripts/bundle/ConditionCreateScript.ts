import { BaseScript } from "../../kernel/BaseScript.js";
import type { ConditionCreateParams, ConditionResult } from "./dto/index.js";

const VALID_CATEGORIES = new Set(["STATE_CHECK", "NUMERIC"]);
const VALID_SUBJECTS = new Set(["ITEM_SELECTED", "ITEM_QTY", "GROUP_TOTAL_QTY"]);
const VALID_TARGET_TYPES = new Set(["ITEM", "GROUP", "BUNDLE"]);

export class ConditionCreateScript extends BaseScript<ConditionCreateParams, ConditionResult> {
  protected async execute(params: ConditionCreateParams): Promise<ConditionResult> {
    // Check if condition group exists
    const group = await this.repository.conditionGroup.findById(params.groupId);
    if (!group) {
      return {
        condition: undefined,
        userErrors: [
          { message: "Condition group not found", field: ["input", "groupId"], code: "NOT_FOUND" },
        ],
      };
    }

    // Validate category
    if (!VALID_CATEGORIES.has(params.category)) {
      return {
        condition: undefined,
        userErrors: [
          { message: "Invalid category", field: ["input", "category"], code: "INVALID" },
        ],
      };
    }

    // Validate subject
    if (!VALID_SUBJECTS.has(params.subject)) {
      return {
        condition: undefined,
        userErrors: [
          { message: "Invalid subject", field: ["input", "subject"], code: "INVALID" },
        ],
      };
    }

    // Validate target type
    if (!VALID_TARGET_TYPES.has(params.targetType)) {
      return {
        condition: undefined,
        userErrors: [
          { message: "Invalid target type", field: ["input", "targetType"], code: "INVALID" },
        ],
      };
    }

    // Validate value is provided for NUMERIC conditions
    if (params.category === "NUMERIC" && (params.value === undefined || params.value === null)) {
      return {
        condition: undefined,
        userErrors: [
          {
            message: "value is required for NUMERIC conditions",
            field: ["input", "value"],
            code: "REQUIRED",
          },
        ],
      };
    }

    const condition = await this.repository.condition.create({
      groupId: params.groupId,
      category: params.category,
      subject: params.subject,
      operator: params.operator,
      targetType: params.targetType,
      targetId: params.targetId,
      value: params.value ?? null,
      sortIndex: params.sortIndex ?? 0,
    });

    return { condition, userErrors: [] };
  }

  protected handleError(_error: unknown): ConditionResult {
    return {
      condition: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
