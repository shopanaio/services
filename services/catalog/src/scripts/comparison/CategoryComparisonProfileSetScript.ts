import { BaseScript, Transactional, type UserError } from "../../kernel/BaseScript.js";
import type { ComparisonProfile } from "../../repositories/models/comparison.js";
import { mapComparisonDatabaseError } from "./validation.js";
interface Result {
  categoryId?: string;
  effectiveProfile?: ComparisonProfile | null;
  userErrors: UserError[];
}
export class CategoryComparisonProfileSetScript extends BaseScript<
  { categoryId: string; profileId: string | null },
  Result
> {
  @Transactional() protected async execute({
    categoryId,
    profileId,
  }: {
    categoryId: string;
    profileId: string | null;
  }): Promise<Result> {
    const locked = await this.repository.comparison.lockCategory(categoryId);
    if (!locked)
      return {
        userErrors: [{ message: "Category not found", field: ["categoryId"], code: "INVALID_ID" }],
      };
    if (profileId && !(await this.repository.comparisonRead.findById(profileId)))
      return {
        userErrors: [
          {
            message: "Comparison profile not found",
            field: ["profileId"],
            code: "COMPARISON_PROFILE_NOT_FOUND",
          },
        ],
      };
    let targetProfileId = profileId;
    if (!targetProfileId && locked.parentId)
      targetProfileId =
        (
          await this.repository.comparisonRead.getEffectiveProfilesByCategoryIds([locked.parentId])
        )[0]?.profileId ?? null;
    if (
      await this.repository.comparisonRead.categoryAssignmentHasConflicts(
        categoryId,
        targetProfileId,
      )
    )
      return {
        userErrors: [
          {
            message: "Category profile change conflicts with existing product mappings",
            field: ["profileId"],
            code: "COMPARISON_CATEGORY_PROFILE_CONFLICT",
          },
        ],
      };
    await this.repository.comparison.setCategoryProfile(categoryId, profileId);
    const effective = (
      await this.repository.comparisonRead.getEffectiveProfilesByCategoryIds([categoryId])
    )[0];
    const effectiveProfile = effective?.profileId
      ? await this.repository.comparisonRead.findById(effective.profileId)
      : null;
    this.logger.info(
      { categoryId, profileId },
      profileId ? "comparison.category_profile.set" : "comparison.category_profile.cleared",
    );
    return { categoryId, effectiveProfile, userErrors: [] };
  }
  protected handleError(error: unknown): Result {
    return { userErrors: mapComparisonDatabaseError(error) };
  }
}
