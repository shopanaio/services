import { BaseScript, Transactional } from "../../../kernel/BaseScript.js";
import { mapComparisonDatabaseError } from "../../../scripts/comparison/validation.js";
import type { ComparisonProfileDeleteScriptResult } from "../dto/index.js";

export class ComparisonProfileDeleteScript extends BaseScript<
  { id: string },
  ComparisonProfileDeleteScriptResult
> {
  @Transactional()
  protected async execute({ id }: { id: string }): Promise<ComparisonProfileDeleteScriptResult> {
    if (!(await this.repository.comparisonRead.findById(id)))
      return {
        userErrors: [
          {
            message: "Comparison profile not found",
            field: ["id"],
            code: "COMPARISON_PROFILE_NOT_FOUND",
          },
        ],
      };
    const dependencies = await this.repository.comparison.getProfileDependencyCounts(id);
    if (Object.values(dependencies).some((count) => count > 0))
      return {
        userErrors: [
          {
            message: "Comparison profile is in use",
            field: ["id"],
            code: "COMPARISON_FIELD_IN_USE",
          },
        ],
      };
    const deletedProfileId = await this.repository.comparison.deleteProfile(id);
    this.logger.info({ profileId: id }, "comparison.profile.deleted");
    return { deletedProfileId: deletedProfileId ?? undefined, userErrors: [] };
  }
  protected handleError(error: unknown): ComparisonProfileDeleteScriptResult {
    return { userErrors: mapComparisonDatabaseError(error) };
  }
}
