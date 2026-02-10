import { BaseScript } from "../../kernel/BaseScript.js";
import type { ConditionUpdateParams, ConditionResult } from "./dto/index.js";

const VALID_CATEGORIES = new Set(["STATE_CHECK", "NUMERIC"]);
const VALID_SUBJECTS = new Set(["ITEM_SELECTED", "ITEM_QTY", "GROUP_TOTAL_QTY"]);
const VALID_TARGET_TYPES = new Set(["ITEM", "GROUP", "BUNDLE"]);

export class ConditionUpdateScript extends BaseScript<ConditionUpdateParams, ConditionResult> {
  protected async execute(params: ConditionUpdateParams): Promise<ConditionResult> {
    // Check if condition exists
    const existing = await this.repository.condition.findById(params.id);
    if (!existing) {
      return {
        condition: undefined,
        userErrors: [
          { message: "Condition not found", field: ["input", "id"], code: "NOT_FOUND" },
        ],
      };
    }

    // Validate category if provided
    if (params.category && !VALID_CATEGORIES.has(params.category)) {
      return {
        condition: undefined,
        userErrors: [
          { message: "Invalid category", field: ["input", "category"], code: "INVALID" },
        ],
      };
    }

    // Validate subject if provided
    if (params.subject && !VALID_SUBJECTS.has(params.subject)) {
      return {
        condition: undefined,
        userErrors: [
          { message: "Invalid subject", field: ["input", "subject"], code: "INVALID" },
        ],
      };
    }

    // Validate target type if provided
    if (params.targetType && !VALID_TARGET_TYPES.has(params.targetType)) {
      return {
        condition: undefined,
        userErrors: [
          { message: "Invalid target type", field: ["input", "targetType"], code: "INVALID" },
        ],
      };
    }

    const condition = await this.repository.condition.update(params.id, {
      category: params.category,
      subject: params.subject,
      operator: params.operator,
      targetType: params.targetType,
      targetId: params.targetId,
      value: params.value,
      sortIndex: params.sortIndex,
    });

    return { condition: condition ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): ConditionResult {
    return {
      condition: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
