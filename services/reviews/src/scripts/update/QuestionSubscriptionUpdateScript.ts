import { BaseScript, Transactional, type UserError } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { QuestionSubscriptionPatch } from "../../repositories/question/QuestionSubscriptionRepository.js";
import {
  conflictError,
  hasOwn,
  internalError,
  notFoundError,
} from "./StoreConfigurationUpdateScript.js";
import type {
  QuestionSubscriptionUpdateParams,
  QuestionSubscriptionUpdateResult,
} from "./types.js";

export class QuestionSubscriptionUpdateScript extends BaseScript<
  QuestionSubscriptionUpdateParams,
  QuestionSubscriptionUpdateResult
> {
  @Transactional()
  protected async execute(
    params: QuestionSubscriptionUpdateParams
  ): Promise<QuestionSubscriptionUpdateResult> {
    const input = params.operations ?? {};
    const patch: QuestionSubscriptionPatch = {};
    const errors: UserError[] = [];

    if (hasOwn(input, "channel")) {
      if (input.channel == null) errors.push(nullError("channel"));
      else patch.channel = input.channel;
    }
    if (hasOwn(input, "status")) {
      if (input.status == null) errors.push(nullError("status"));
      else patch.status = input.status;
    }
    if (hasOwn(input, "locale")) {
      const locale = input.locale?.trim();
      if (!locale || locale.length > 35) {
        errors.push({
          message: "Locale must contain between 1 and 35 characters",
          code: "INVALID_LOCALE",
          field: ["operations", "locale"],
        });
      } else {
        patch.locale = locale;
      }
    }
    if (errors.length > 0) return { userErrors: errors };

    try {
      const updated = await this.repository.questionSubscription.update(
        params.subscriptionId,
        params.expectedUpdatedAt,
        patch
      );
      if (updated.status === "applied") {
        return {
          subscription: {
            id: updated.value.id,
            questionId: updated.value.questionId,
          },
          userErrors: [],
        };
      }
      return updated.status === "conflict"
        ? { userErrors: [conflictError("Subscription", "expectedUpdatedAt")] }
        : { userErrors: [notFoundError("Subscription", "subscriptionId")] };
    } catch (error) {
      if (isUniqueViolation(error, "question_subscription_unique")) {
        return {
          userErrors: [{
            message: "A subscription for this channel already exists",
            code: "DUPLICATE_SUBSCRIPTION",
            field: ["operations", "channel"],
          }],
        };
      }
      throw error;
    }
  }

  protected handleError(): QuestionSubscriptionUpdateResult {
    return { userErrors: [internalError()] };
  }
}

function nullError(field: string): UserError {
  return {
    message: `${field} cannot be null`,
    code: "INVALID_VALUE",
    field: ["operations", field],
  };
}
