import { BaseScript, Transactional, type UserError } from "../../kernel/BaseScript.js";
import type { ComparisonProfileAggregateInput } from "../../repositories/comparison/comparison-types.js";
import type { ComparisonProfileNestedInput, ComparisonProfileMutationResult } from "./dto.js";
import {
  mapComparisonDatabaseError,
  validateComparisonProfileCreateIds,
  validateProfileInput,
} from "./validation.js";

abstract class ProfileScript<TParams, TResult> extends BaseScript<TParams, TResult> {
  protected async aggregate(
    id: string,
    input: ComparisonProfileNestedInput,
  ): Promise<ComparisonProfileAggregateInput> {
    const count =
      input.groups.filter((g) => !g.id).length +
      input.groups.flatMap((g) => g.fields).filter((f) => !f.id).length +
      input.groups.flatMap((g) => g.fields.flatMap((f) => f.options)).filter((o) => !o.id).length;
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
}
export class ComparisonProfileCreateScript extends ProfileScript<
  { input: ComparisonProfileNestedInput },
  ComparisonProfileMutationResult
> {
  @Transactional() protected async execute({ input }: { input: ComparisonProfileNestedInput }) {
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
      await this.aggregate(id!, input),
    );
    this.logger.info({ profileId: profile.id }, "comparison.profile.created");
    return { profile, userErrors: [] };
  }
  protected handleError(error: unknown): ComparisonProfileMutationResult {
    return { userErrors: mapComparisonDatabaseError(error) };
  }
}
export class ComparisonProfileUpdateScript extends ProfileScript<
  { id: string; input: ComparisonProfileNestedInput },
  ComparisonProfileMutationResult
> {
  @Transactional() protected async execute({
    id,
    input,
  }: {
    id: string;
    input: ComparisonProfileNestedInput;
  }) {
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
      fields.map((r) => r.id),
    );
    if (input.groups.some((g) => g.id && !groups.some((r) => r.id === g.id)))
      return {
        userErrors: [
          {
            message: "Comparison group is not owned by profile",
            code: "COMPARISON_GROUP_NOT_OWNED",
          },
        ],
      };
    if (
      input.groups.flatMap((g) => g.fields).some((f) => f.id && !fields.some((r) => r.id === f.id))
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
        .flatMap((g) => g.fields.flatMap((f) => f.options))
        .some((o) => o.id && !options.some((r) => r.id === o.id))
    )
      return {
        userErrors: [
          {
            message: "Comparison enum option is not owned by field",
            code: "COMPARISON_ENUM_OPTION_INVALID",
          },
        ],
      };
    const profile = await this.repository.comparison.updateProfile(await this.aggregate(id, input));
    this.logger.info({ profileId: id, revision: profile.revision }, "comparison.profile.updated");
    return { profile, userErrors: [] };
  }
  protected handleError(error: unknown): ComparisonProfileMutationResult {
    return { userErrors: mapComparisonDatabaseError(error) };
  }
}
export class ComparisonProfileDeleteScript extends BaseScript<
  { id: string },
  { deletedProfileId?: string; userErrors: UserError[] }
> {
  @Transactional() protected async execute({ id }: { id: string }) {
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
  protected handleError(error: unknown): { deletedProfileId?: string; userErrors: UserError[] } {
    return { userErrors: mapComparisonDatabaseError(error) };
  }
}
