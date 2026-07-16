import { BaseScript, Transactional, type UserError } from "../../kernel/BaseScript.js";
import type { StoreConfigurationPatch } from "../../repositories/configuration/ConfigurationRepository.js";
import type {
  StoreConfigurationUpdateParams,
  StoreConfigurationUpdateResult,
} from "./types.js";

const booleanFields = [
  "reviewsEnabled",
  "questionsEnabled",
  "guestReviewsEnabled",
  "guestQuestionsEnabled",
  "customerAnswersEnabled",
  "verifiedPurchaseRequired",
  "reviewRequestsEnabled",
] as const;

const enumFields = [
  "reviewModerationMode",
  "questionModerationMode",
  "answerModerationMode",
  "reviewDuplicatePolicy",
] as const;

const numberFields = {
  reviewRequestDelayDays: [1, 180],
  reviewRequestExpiryDays: [1, 365],
  reviewEditWindowHours: [0, 8760],
  questionEditWindowHours: [0, 8760],
  answerEditWindowHours: [0, 8760],
  maxReviewMediaCount: [0, 20],
  maxAnswersPerQuestion: [1, 100],
} as const;

export class StoreConfigurationUpdateScript extends BaseScript<
  StoreConfigurationUpdateParams,
  StoreConfigurationUpdateResult
> {
  @Transactional()
  protected async execute(
    params: StoreConfigurationUpdateParams
  ): Promise<StoreConfigurationUpdateResult> {
    const input = params.operations ?? {};
    const patch: StoreConfigurationPatch = {};
    const errors: UserError[] = [];

    for (const field of booleanFields) {
      if (!hasOwn(input, field)) continue;
      const value = input[field];
      if (value == null) errors.push(nullError(field));
      else Object.assign(patch, { [field]: value });
    }
    for (const field of enumFields) {
      if (!hasOwn(input, field)) continue;
      const value = input[field];
      if (value == null) errors.push(nullError(field));
      else Object.assign(patch, { [field]: value });
    }
    for (const [field, [min, max]] of Object.entries(numberFields) as Array<
      [keyof typeof numberFields, readonly [number, number]]
    >) {
      if (!hasOwn(input, field)) continue;
      const value = input[field];
      if (value == null || !Number.isInteger(value) || value < min || value > max) {
        errors.push({
          message: `${field} must be an integer between ${min} and ${max}`,
          code: "INVALID_VALUE",
          field: ["operations", field],
        });
      } else {
        Object.assign(patch, { [field]: value });
      }
    }
    if (errors.length > 0) return { userErrors: errors };

    const updated = await this.repository.configuration.updateStoreConfiguration(
      params.configurationId,
      params.expectedRevision,
      patch
    );
    if (updated.status === "applied") {
      return { configuration: updated.value, userErrors: [] };
    }
    return updated.status === "conflict"
      ? { userErrors: [conflictError("Configuration", "expectedRevision")] }
      : { userErrors: [notFoundError("Configuration", "configurationId")] };
  }

  protected handleError(): StoreConfigurationUpdateResult {
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

export function notFoundError(entity: string, field: string): UserError {
  return { message: `${entity} not found`, code: "NOT_FOUND", field: [field] };
}

export function conflictError(entity: string, field: string): UserError {
  return {
    message: `${entity} was modified by another user`,
    code: "VERSION_CONFLICT",
    field: [field],
  };
}

export function internalError(): UserError {
  return { message: "Internal error", code: "INTERNAL_ERROR" };
}

export function hasOwn(input: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(input, field);
}
