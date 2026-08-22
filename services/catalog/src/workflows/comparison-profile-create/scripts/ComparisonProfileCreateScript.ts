import { BaseScript, Transactional } from "../../../kernel/BaseScript.js";
import type { ComparisonProfileAggregateInput } from "../../../repositories/comparison/comparison-types.js";
import {
  mapComparisonDatabaseError,
  validateComparisonProfileCreateIds,
  validateProfileInput,
} from "../../../scripts/comparison/validation.js";
import type {
  ComparisonProfileCreateScriptResult,
  ComparisonProfileNestedInput,
} from "../dto/index.js";

export class ComparisonProfileCreateScript extends BaseScript<
  { input: ComparisonProfileNestedInput },
  ComparisonProfileCreateScriptResult
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
    input,
  }: {
    input: ComparisonProfileNestedInput;
  }): Promise<ComparisonProfileCreateScriptResult> {
    const userErrors = [
      ...validateComparisonProfileCreateIds(input),
      ...validateProfileInput(input),
    ];
    if (userErrors.length) return { userErrors };
    if (await this.repository.comparisonRead.findByHandle(input.handle.trim()))
      return {
        userErrors: [
          {
            message: "Comparison profile handle is already used",
            field: ["handle"],
            code: "COMPARISON_PROFILE_HANDLE_TAKEN",
          },
        ],
      };
    const [id] = await this.repository.comparison.generateIds(1);
    const profile = await this.repository.comparison.createProfile(
      await this.definition(id!, input),
    );
    this.logger.info({ profileId: profile.id }, "comparison.profile.created");
    return { profile, userErrors: [] };
  }

  protected handleError(error: unknown): ComparisonProfileCreateScriptResult {
    return { userErrors: mapComparisonDatabaseError(error) };
  }
}
