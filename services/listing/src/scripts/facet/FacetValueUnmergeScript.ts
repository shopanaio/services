import { BaseScript, Transactional, type UserError } from "../../kernel/BaseScript.js";
import type { FacetValue } from "../../repositories/models/index.js";
import type { FacetValueUnmergeParams, FacetValueUnmergeResult } from "./dto/index.js";

export class FacetValueUnmergeScript extends BaseScript<
  FacetValueUnmergeParams,
  FacetValueUnmergeResult
> {
  @Transactional()
  protected async execute(params: FacetValueUnmergeParams): Promise<FacetValueUnmergeResult> {
    const sourceValueIds = [...new Set(params.sourceValueIds)];
    if (sourceValueIds.length === 0) {
      return {
        sourceValues: [],
        affectedGroupValues: [],
        userErrors: [
          {
            message: "sourceValueIds are required",
            field: ["sourceValueIds"],
            code: "SOURCE_VALUES_REQUIRED",
          },
        ],
      };
    }

    const sourceValues = await this.repository.facetValue.getByIds(sourceValueIds);
    const sourceErrors = this.validateSourceValues(sourceValueIds, sourceValues);
    if (sourceErrors.length > 0) {
      return { sourceValues: [], affectedGroupValues: [], userErrors: sourceErrors };
    }

    const conflictErrors = await this.validateRootHandleConflicts(sourceValues);
    if (conflictErrors.length > 0) {
      return {
        sourceValues: [],
        affectedGroupValues: [],
        userErrors: conflictErrors,
      };
    }

    const oldGroupIds = [
      ...new Set(sourceValues.flatMap((value) => (value.parentId ? [value.parentId] : []))),
    ];

    await this.repository.facetValue.detachSources(sourceValueIds);

    const [detachedSourceValues, affectedGroupValues] = await Promise.all([
      this.repository.facetValue.getByIds(sourceValueIds),
      this.deleteEmptyGroupValues(oldGroupIds),
    ]);

    return {
      sourceValues: detachedSourceValues,
      affectedGroupValues,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): FacetValueUnmergeResult {
    return {
      sourceValues: [],
      affectedGroupValues: [],
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }

  private validateSourceValues(
    requestedIds: readonly string[],
    sourceValues: readonly FacetValue[],
  ): UserError[] {
    const valuesById = new Map(sourceValues.map((value) => [value.id, value]));
    const errors: UserError[] = [];

    for (const sourceValueId of requestedIds) {
      const sourceValue = valuesById.get(sourceValueId);
      if (!sourceValue) {
        errors.push({
          message: "Invalid source value ID",
          field: ["sourceValueIds"],
          code: "INVALID_SOURCE_VALUE_ID",
        });
        continue;
      }

      if (sourceValue.kind !== "source") {
        errors.push({
          message: "Source value must have kind SOURCE",
          field: ["sourceValueIds"],
          code: "SOURCE_NOT_SOURCE",
        });
      }

      if (!sourceValue.parentId) {
        errors.push({
          message: "Source value is not merged",
          field: ["sourceValueIds"],
          code: "SOURCE_NOT_MERGED",
        });
      }
    }

    return errors;
  }

  private async validateRootHandleConflicts(
    sourceValues: readonly FacetValue[],
  ): Promise<UserError[]> {
    const valuesByFacetId = new Map<string, FacetValue[]>();
    for (const sourceValue of sourceValues) {
      const values = valuesByFacetId.get(sourceValue.facetId) ?? [];
      values.push(sourceValue);
      valuesByFacetId.set(sourceValue.facetId, values);
    }

    const errors: UserError[] = [];
    const sourceValueIds = new Set(sourceValues.map((value) => value.id));
    for (const [facetId, values] of valuesByFacetId.entries()) {
      const roots = await this.repository.facetValue.getRootValuesByFacetIdAndHandles(
        facetId,
        values.map((value) => value.handle),
      );
      const conflictingRoot = roots.find((root) => !sourceValueIds.has(root.id));
      if (conflictingRoot) {
        errors.push({
          message: "Unmerge would create a duplicate visible value handle",
          field: ["sourceValueIds"],
          code: "ROOT_HANDLE_CONFLICT",
        });
      }
    }

    return errors;
  }

  private async deleteEmptyGroupValues(groupValueIds: readonly string[]): Promise<FacetValue[]> {
    if (groupValueIds.length === 0) {
      return [];
    }

    const [groupValues, remainingChildren] = await Promise.all([
      this.repository.facetValue.getByIds(groupValueIds),
      this.repository.facetValue.getSourceChildrenByParentIds(groupValueIds),
    ]);

    const childrenByGroupId = new Map<string, FacetValue[]>();
    for (const child of remainingChildren) {
      if (!child.parentId) continue;
      const children = childrenByGroupId.get(child.parentId) ?? [];
      children.push(child);
      childrenByGroupId.set(child.parentId, children);
    }

    const affectedGroupValues: FacetValue[] = [];
    for (const groupValue of groupValues) {
      const remaining = childrenByGroupId.get(groupValue.id) ?? [];
      if (remaining.length > 0) {
        affectedGroupValues.push(groupValue);
        continue;
      }

      await this.repository.facetValue.delete(groupValue.id);
    }

    return affectedGroupValues;
  }
}
