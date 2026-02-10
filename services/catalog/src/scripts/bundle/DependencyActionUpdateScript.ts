import { BaseScript } from "../../kernel/BaseScript.js";
import type { DependencyActionUpdateParams, DependencyActionResult } from "./dto/index.js";

const VALID_ACTION_TYPES = new Set(["SHOW", "HIDE", "SET_REQUIRED", "ADJUST_PRICE"]);
const VALID_TARGET_TYPES = new Set(["ITEM", "GROUP", "BUNDLE"]);
const VALID_PRICE_TYPES = new Set(["BASE", "FREE", "FIXED", "PERCENT_OFF", "AMOUNT_OFF"]);

export class DependencyActionUpdateScript extends BaseScript<
  DependencyActionUpdateParams,
  DependencyActionResult
> {
  protected async execute(
    params: DependencyActionUpdateParams
  ): Promise<DependencyActionResult> {
    // Check if action exists
    const existing = await this.repository.dependencyAction.findById(params.id);
    if (!existing) {
      return {
        dependencyAction: undefined,
        userErrors: [
          { message: "Dependency action not found", field: ["input", "id"], code: "NOT_FOUND" },
        ],
      };
    }

    // Validate action type if provided
    if (params.actionType && !VALID_ACTION_TYPES.has(params.actionType)) {
      return {
        dependencyAction: undefined,
        userErrors: [
          { message: "Invalid action type", field: ["input", "actionType"], code: "INVALID" },
        ],
      };
    }

    // Validate target type if provided
    if (params.targetType && !VALID_TARGET_TYPES.has(params.targetType)) {
      return {
        dependencyAction: undefined,
        userErrors: [
          { message: "Invalid target type", field: ["input", "targetType"], code: "INVALID" },
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

    const dependencyAction = await this.repository.dependencyAction.update(params.id, {
      actionType: params.actionType,
      targetType: params.targetType,
      targetId: params.targetId,
      requiredValue: params.requiredValue,
      priceType: params.priceType,
      priceValue: params.priceValue,
      stackable: params.stackable,
      sortIndex: params.sortIndex,
    });

    return { dependencyAction: dependencyAction ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): DependencyActionResult {
    return {
      dependencyAction: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
