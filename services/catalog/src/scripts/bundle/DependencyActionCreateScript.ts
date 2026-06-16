import { BaseScript } from "../../kernel/BaseScript.js";
import type { DependencyActionCreateParams, DependencyActionResult } from "./dto/index.js";

const VALID_ACTION_TYPES = new Set(["SHOW", "HIDE", "SET_REQUIRED", "ADJUST_PRICE"]);
const VALID_TARGET_TYPES = new Set(["ITEM", "GROUP", "BUNDLE"]);
const VALID_PRICE_TYPES = new Set(["BASE", "FREE", "FIXED", "PERCENT_OFF", "AMOUNT_OFF"]);

export class DependencyActionCreateScript extends BaseScript<
  DependencyActionCreateParams,
  DependencyActionResult
> {
  protected async execute(
    params: DependencyActionCreateParams
  ): Promise<DependencyActionResult> {
    // Check if rule exists
    const rule = await this.repository.dependencyRule.findById(params.ruleId);
    if (!rule) {
      return {
        dependencyAction: undefined,
        userErrors: [
          { message: "Dependency rule not found", field: ["input", "ruleId"], code: "NOT_FOUND" },
        ],
      };
    }

    // Validate action type
    if (!VALID_ACTION_TYPES.has(params.actionType)) {
      return {
        dependencyAction: undefined,
        userErrors: [
          { message: "Invalid action type", field: ["input", "actionType"], code: "INVALID" },
        ],
      };
    }

    // Validate target type
    if (!VALID_TARGET_TYPES.has(params.targetType)) {
      return {
        dependencyAction: undefined,
        userErrors: [
          { message: "Invalid target type", field: ["input", "targetType"], code: "INVALID" },
        ],
      };
    }

    // Validate targetId is provided for non-BUNDLE targets
    if (params.targetType !== "BUNDLE" && !params.targetId) {
      return {
        dependencyAction: undefined,
        userErrors: [
          {
            message: "targetId is required for ITEM and GROUP targets",
            field: ["input", "targetId"],
            code: "REQUIRED",
          },
        ],
      };
    }

    // Validate priceType is valid if provided
    if (params.priceType && !VALID_PRICE_TYPES.has(params.priceType)) {
      return {
        dependencyAction: undefined,
        userErrors: [
          { message: "Invalid price type", field: ["input", "priceType"], code: "INVALID" },
        ],
      };
    }

    // Validate ADJUST_PRICE action has priceType
    if (params.actionType === "ADJUST_PRICE" && !params.priceType) {
      return {
        dependencyAction: undefined,
        userErrors: [
          {
            message: "priceType is required for ADJUST_PRICE action",
            field: ["input", "priceType"],
            code: "REQUIRED",
          },
        ],
      };
    }

    const dependencyAction = await this.repository.dependencyAction.create({
      ruleId: params.ruleId,
      actionType: params.actionType,
      targetType: params.targetType,
      targetId: params.targetId ?? null,
      requiredValue: params.requiredValue ?? null,
      priceType: params.priceType ?? null,
      priceValue: params.priceValue ?? null,
      stackable: params.stackable ?? false,
      sortIndex: params.sortIndex ?? 0,
    });

    return { dependencyAction, userErrors: [] };
  }

  protected handleError(_error: unknown): DependencyActionResult {
    return {
      dependencyAction: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
