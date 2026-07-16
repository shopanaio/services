import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { UserError } from "../../kernel/BaseScript.js";
import type {
  RatingCriterionCreateParams,
  RatingCriterionCreateResult,
} from "./types.js";
import { internalError } from "./content.js";

export class RatingCriterionCreateScript extends BaseScript<
  RatingCriterionCreateParams,
  RatingCriterionCreateResult
> {
  @Transactional()
  protected async execute(
    params: RatingCriterionCreateParams
  ): Promise<RatingCriterionCreateResult> {
    const code = params.code.trim();
    const title = params.defaultTitle.trim();
    const errors: UserError[] = [];

    if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(code)) {
      errors.push({ message: "Criterion code has an invalid format", code: "INVALID_CODE", field: ["code"] });
    }
    if (!title) {
      errors.push({ message: "Criterion title cannot be empty", code: "INVALID_TITLE", field: ["defaultTitle"] });
    }
    if (params.weight !== undefined && params.weight !== null && params.weight <= 0) {
      errors.push({ message: "Criterion weight must be greater than zero", code: "INVALID_WEIGHT", field: ["weight"] });
    }
    if (params.sortIndex !== undefined && params.sortIndex !== null && params.sortIndex < 0) {
      errors.push({ message: "Sort index cannot be negative", code: "INVALID_SORT_INDEX", field: ["sortIndex"] });
    }
    const translationLocales = new Set<string>();
    for (const [index, translation] of (params.translations ?? []).entries()) {
      if (!translation.locale.trim() || !translation.title.trim()) {
        errors.push({ message: "Translation locale and title cannot be empty", code: "INVALID_TRANSLATION", field: ["translations", String(index)] });
      }
      const locale = translation.locale.trim().toLowerCase();
      if (translationLocales.has(locale)) {
        errors.push({ message: "A locale may only be translated once", code: "DUPLICATE_TRANSLATION", field: ["translations", String(index), "locale"] });
      }
      translationLocales.add(locale);
    }
    const assignmentKeys = new Set<string>();
    for (const [index, assignment] of (params.assignments ?? []).entries()) {
      if (assignment.sortIndexOverride !== undefined && assignment.sortIndexOverride !== null && assignment.sortIndexOverride < 0) {
        errors.push({ message: "Assignment sort index cannot be negative", code: "INVALID_SORT_INDEX", field: ["assignments", String(index), "sortIndexOverride"] });
      }
      const key = `${assignment.targetType}:${assignment.targetId}`;
      if (assignmentKeys.has(key)) {
        errors.push({ message: "A target may only be assigned once", code: "DUPLICATE_ASSIGNMENT", field: ["assignments", String(index), "targetId"] });
      }
      assignmentKeys.add(key);
    }
    if (errors.length > 0) return { userErrors: errors };

    try {
      const aggregate = await this.repository.configuration.createCriterion({
        criterion: {
          code,
          defaultTitle: title,
          defaultDescription: params.defaultDescription?.trim() || null,
          weight: params.weight ?? 1,
          isRequired: params.isRequired ?? false,
          isActive: params.isActive ?? true,
          appliesToAllProducts: params.appliesToAllProducts ?? true,
          sortIndex: params.sortIndex ?? 0,
        },
        translations: (params.translations ?? []).map((item) => ({
          locale: item.locale.trim(),
          title: item.title.trim(),
          description: item.description?.trim() || null,
        })),
        assignments: (params.assignments ?? []).map((item) => ({
          targetType: item.targetType,
          targetId: item.targetId,
          isRequiredOverride: item.isRequiredOverride ?? null,
          sortIndexOverride: item.sortIndexOverride ?? null,
        })),
      });
      this.logger.info({ criterionId: aggregate.criterion.id }, "Review rating criterion created");
      return { criterion: { id: aggregate.criterion.id }, userErrors: [] };
    } catch (error) {
      if (isUniqueViolation(error, "rating_criterion_store_code_unique")) {
        return { userErrors: [{ message: "A rating criterion with this code already exists", code: "DUPLICATE_CODE", field: ["code"] }] };
      }
      throw error;
    }
  }

  protected handleError(): RatingCriterionCreateResult {
    return { userErrors: internalError() };
  }
}
