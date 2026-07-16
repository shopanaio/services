import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { RatingCriterionPatch } from "../../repositories/configuration/ConfigurationRepository.js";
import type { RatingCriterionUpdateOperation } from "../../workflows/dto/index.js";
import {
  internalSectionError,
  sectionErrors,
  sectionSuccess,
  type ReviewSectionResult,
} from "./types.js";

export interface RatingCriterionSectionUpdateParams {
  criterionId: string;
  operation: RatingCriterionUpdateOperation;
}

export class RatingCriterionSectionUpdateScript extends BaseScript<
  RatingCriterionSectionUpdateParams,
  ReviewSectionResult
> {
  @Transactional()
  protected async execute(
    params: RatingCriterionSectionUpdateParams
  ): Promise<ReviewSectionResult> {
    const aggregate = await this.repository.configuration.findCriterionById(
      params.criterionId
    );
    if (!aggregate) {
      return sectionErrors([
        { message: "Rating criterion not found", code: "NOT_FOUND" },
      ]);
    }

    switch (params.operation.type) {
      case "ratingCriterionDefinitionUpdate":
        return this.updateDefinition(
          params.criterionId,
          params.operation.params
        );
      case "ratingCriterionApplicabilityUpdate":
        return this.updatePatch(params.criterionId, {
          appliesToAllProducts: params.operation.params.appliesToAllProducts,
        });
      case "ratingCriterionTranslationsSync":
        return this.syncTranslations(
          params.criterionId,
          params.operation.params.items
        );
      case "ratingCriterionAssignmentsSync":
        return this.syncAssignments(
          params.criterionId,
          params.operation.params.items
        );
    }
  }

  protected handleError(error: unknown): ReviewSectionResult {
    if (isUniqueViolation(error, "rating_criterion_store_code_unique")) {
      return sectionErrors([
        {
          message: "A rating criterion with this code already exists",
          code: "DUPLICATE_CODE",
          field: ["code"],
        },
      ]);
    }
    return internalSectionError();
  }

  private async updateDefinition(
    criterionId: string,
    input: Extract<
      RatingCriterionUpdateOperation,
      { type: "ratingCriterionDefinitionUpdate" }
    >["params"]
  ): Promise<ReviewSectionResult> {
    const patch: RatingCriterionPatch = {};
    const errors: ReviewSectionResult["userErrors"] = [];

    if (hasOwn(input, "code")) {
      const code = input.code?.trim();
      if (!code || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(code)) {
        errors.push({
          message: "Criterion code has an invalid format",
          code: "INVALID_CODE",
          field: ["code"],
        });
      } else {
        patch.code = code;
      }
    }
    if (hasOwn(input, "defaultTitle")) {
      const title = input.defaultTitle?.trim();
      if (!title || title.length > 150) {
        errors.push({
          message: "Criterion title must contain between 1 and 150 characters",
          code: "INVALID_TITLE",
          field: ["defaultTitle"],
        });
      } else {
        patch.defaultTitle = title;
      }
    }
    if (hasOwn(input, "defaultDescription")) {
      patch.defaultDescription = input.defaultDescription?.trim() || null;
    }
    if (hasOwn(input, "weight")) {
      if (input.weight == null || input.weight <= 0) {
        errors.push({
          message: "Criterion weight must be greater than zero",
          code: "INVALID_WEIGHT",
          field: ["weight"],
        });
      } else {
        patch.weight = input.weight;
      }
    }
    if (hasOwn(input, "isRequired")) {
      if (input.isRequired == null) {
        errors.push(invalidNull("isRequired"));
      } else {
        patch.isRequired = input.isRequired;
      }
    }
    if (hasOwn(input, "isActive")) {
      if (input.isActive == null) {
        errors.push(invalidNull("isActive"));
      } else {
        patch.isActive = input.isActive;
      }
    }
    if (hasOwn(input, "sortIndex")) {
      if (input.sortIndex == null || input.sortIndex < 0) {
        errors.push({
          message: "Sort index cannot be negative",
          code: "INVALID_SORT_INDEX",
          field: ["sortIndex"],
        });
      } else {
        patch.sortIndex = input.sortIndex;
      }
    }
    if (errors.length > 0) return sectionErrors(errors);
    if (Object.keys(patch).length === 0) return sectionSuccess(false);
    return this.updatePatch(criterionId, patch);
  }

  private async updatePatch(
    criterionId: string,
    patch: RatingCriterionPatch
  ): Promise<ReviewSectionResult> {
    const updated =
      await this.repository.configuration.updateCriterionWithinVersion(
        criterionId,
        patch
      );
    return updated
      ? sectionSuccess()
      : sectionErrors([
          { message: "Rating criterion not found", code: "NOT_FOUND" },
        ]);
  }

  private async syncTranslations(
    criterionId: string,
    items: Extract<
      RatingCriterionUpdateOperation,
      { type: "ratingCriterionTranslationsSync" }
    >["params"]["items"]
  ): Promise<ReviewSectionResult> {
    const errors: ReviewSectionResult["userErrors"] = [];
    const locales = new Set<string>();
    const mapped = items.map((item, index) => {
      const locale = item.locale.trim();
      const title = item.title.trim();
      const normalizedLocale = locale.toLowerCase();
      if (!locale || locale.length > 35 || !title || title.length > 150) {
        errors.push({
          message: "Translation locale and title are invalid",
          code: "INVALID_TRANSLATION",
          field: [String(index)],
        });
      }
      if (locales.has(normalizedLocale)) {
        errors.push({
          message: "A locale may only be translated once",
          code: "DUPLICATE_TRANSLATION",
          field: [String(index), "locale"],
        });
      }
      locales.add(normalizedLocale);
      return {
        locale,
        title,
        description: item.description?.trim() || null,
      };
    });
    if (errors.length > 0) return sectionErrors(errors);
    await this.repository.configuration.replaceCriterionTranslations(
      criterionId,
      mapped
    );
    return sectionSuccess();
  }

  private async syncAssignments(
    criterionId: string,
    items: Extract<
      RatingCriterionUpdateOperation,
      { type: "ratingCriterionAssignmentsSync" }
    >["params"]["items"]
  ): Promise<ReviewSectionResult> {
    const errors: ReviewSectionResult["userErrors"] = [];
    const keys = new Set<string>();
    const mapped = items.map((item, index) => {
      const key = `${item.targetType}:${item.targetId}`;
      if (keys.has(key)) {
        errors.push({
          message: "A target may only be assigned once",
          code: "DUPLICATE_ASSIGNMENT",
          field: [String(index), "targetId"],
        });
      }
      keys.add(key);
      if (item.sortIndexOverride != null && item.sortIndexOverride < 0) {
        errors.push({
          message: "Assignment sort index cannot be negative",
          code: "INVALID_SORT_INDEX",
          field: [String(index), "sortIndexOverride"],
        });
      }
      return {
        targetType: item.targetType,
        targetId: item.targetId,
        isRequiredOverride: item.isRequiredOverride ?? null,
        sortIndexOverride: item.sortIndexOverride ?? null,
      };
    });
    if (errors.length > 0) return sectionErrors(errors);
    await this.repository.configuration.replaceCriterionAssignments(
      criterionId,
      mapped
    );
    return sectionSuccess();
  }
}

function invalidNull(field: string) {
  return {
    message: `${field} cannot be null`,
    code: "INVALID_VALUE",
    field: [field],
  };
}

function hasOwn(input: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(input, field);
}
