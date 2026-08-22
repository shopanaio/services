import { BaseScript, Transactional } from "../../../kernel/BaseScript.js";
import type { ComparisonProfileAggregateInput } from "../../../repositories/comparison/comparison-types.js";
import {
  mapComparisonDatabaseError,
  validateProfileInput,
} from "../../../scripts/comparison/validation.js";
import type {
  ComparisonProfileNestedInput,
  ComparisonProfileUpdateScriptResult,
} from "../dto/index.js";

export class ComparisonProfileUpdateScript extends BaseScript<
  { id: string; input: ComparisonProfileNestedInput },
  ComparisonProfileUpdateScriptResult
> {
  private async definition(
    id: string,
    input: ComparisonProfileNestedInput,
  ): Promise<ComparisonProfileAggregateInput> {
    const count =
      input.groups.filter((group) => !group.id).length +
      input.groups.flatMap((group) => group.fields).filter((field) => !field.id).length +
      input.groups
        .flatMap((group) => group.fields.flatMap((field) => field.options))
        .filter((option) => !option.id).length;
    const ids = await this.repository.comparison.generateIds(count);
    let cursor = 0;
    return {
      id,
      handle: input.handle.trim(),
      enabled: input.enabled,
      name: input.name.trim(),
      missingLabel: input.missingLabel.trim(),
      notApplicableLabel: input.notApplicableLabel.trim(),
      unavailableLabel: input.unavailableLabel.trim(),
      locale: this.getLocale(),
      groups: input.groups.map((group) => ({
        ...group,
        id: group.id ?? ids[cursor++]!,
        handle: group.handle.trim(),
        name: group.name.trim(),
        fields: group.fields.map((field) => ({
          ...field,
          id: field.id ?? ids[cursor++]!,
          handle: field.handle.trim(),
          name: field.name.trim(),
          canonicalUnit: field.canonicalUnit?.trim() || null,
          options: field.options.map((option) => ({
            ...option,
            id: option.id ?? ids[cursor++]!,
            handle: option.handle.trim(),
            name: option.name.trim(),
          })),
        })),
      })),
    };
  }

  @Transactional()
  protected async execute({
    id,
    input,
  }: {
    id: string;
    input: ComparisonProfileNestedInput;
  }): Promise<ComparisonProfileUpdateScriptResult> {
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
    const userErrors = validateProfileInput(input);
    if (userErrors.length) return { userErrors };
    const groups = await this.repository.comparisonRead.getGroupsByProfileIds([id]);
    const fields = await this.repository.comparisonRead.getFieldsByProfileIds([id]);
    const options = await this.repository.comparisonRead.getOptionsByFieldIds(
      fields.map((field) => field.id),
    );
    if (input.groups.some((group) => group.id && !groups.some((row) => row.id === group.id)))
      return {
        userErrors: [
          {
            message: "Comparison group is not owned by profile",
            code: "COMPARISON_GROUP_NOT_OWNED",
          },
        ],
      };
    if (
      input.groups
        .flatMap((group) => group.fields)
        .some((field) => field.id && !fields.some((row) => row.id === field.id))
    )
      return {
        userErrors: [
          {
            message: "Comparison field is not owned by profile",
            code: "COMPARISON_FIELD_NOT_OWNED",
          },
        ],
      };
    if (
      input.groups
        .flatMap((group) => group.fields.flatMap((field) => field.options))
        .some((option) => option.id && !options.some((row) => row.id === option.id))
    )
      return {
        userErrors: [
          {
            message: "Comparison enum option is not owned by field",
            code: "COMPARISON_ENUM_OPTION_INVALID",
          },
        ],
      };
    const profile = await this.repository.comparison.updateProfile(
      await this.definition(id, input),
    );
    this.logger.info({ profileId: id }, "comparison.profile.updated");
    return { profile, userErrors: [] };
  }

  protected handleError(error: unknown): ComparisonProfileUpdateScriptResult {
    return { userErrors: mapComparisonDatabaseError(error) };
  }
}
