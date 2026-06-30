import {
  BaseScript,
  Transactional,
  type UserError,
} from "../../kernel/BaseScript.js";
import type { FacetValue } from "../../repositories/models/index.js";
import type {
  FacetValueEmptyDisplayAction,
  FacetValueUnmergeParams,
  FacetValueUnmergeResult,
} from "./dto/index.js";

const EMPTY_DISPLAY_ACTIONS = new Set(["disable", "delete", "keep"]);

export class FacetValueUnmergeScript extends BaseScript<
  FacetValueUnmergeParams,
  FacetValueUnmergeResult
> {
  @Transactional()
  protected async execute(
    params: FacetValueUnmergeParams
  ): Promise<FacetValueUnmergeResult> {
    const sourceValueIds = [...new Set(params.sourceValueIds)];
    if (sourceValueIds.length === 0) {
      return {
        sourceValues: [],
        affectedDisplayValues: [],
        userErrors: [
          {
            message: "sourceValueIds are required",
            field: ["sourceValueIds"],
            code: "SOURCE_VALUES_REQUIRED",
          },
        ],
      };
    }

    const action = params.emptyDisplayAction ?? "disable";
    if (!EMPTY_DISPLAY_ACTIONS.has(action)) {
      return {
        sourceValues: [],
        affectedDisplayValues: [],
        userErrors: [
          {
            message: "Invalid empty display action",
            field: ["emptyDisplayAction"],
            code: "EMPTY_DISPLAY_ACTION_INVALID",
          },
        ],
      };
    }

    const sourceValues = await this.repository.facetValue.getByIds(sourceValueIds);
    const sourceErrors = this.validateSourceValues(sourceValueIds, sourceValues);
    if (sourceErrors.length > 0) {
      return { sourceValues: [], affectedDisplayValues: [], userErrors: sourceErrors };
    }

    const conflictErrors = await this.validateRootHandleConflicts(sourceValues);
    if (conflictErrors.length > 0) {
      return {
        sourceValues: [],
        affectedDisplayValues: [],
        userErrors: conflictErrors,
      };
    }

    const oldDisplayIds = [
      ...new Set(sourceValues.flatMap((value) => value.parentId ? [value.parentId] : [])),
    ];

    await this.repository.facetValue.detachSources(sourceValueIds);

    const [detachedSourceValues, affectedDisplayValues] = await Promise.all([
      this.repository.facetValue.getByIds(sourceValueIds),
      this.applyEmptyDisplayAction(oldDisplayIds, action),
    ]);

    return {
      sourceValues: detachedSourceValues,
      affectedDisplayValues,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): FacetValueUnmergeResult {
    return {
      sourceValues: [],
      affectedDisplayValues: [],
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }

  private validateSourceValues(
    requestedIds: readonly string[],
    sourceValues: readonly FacetValue[]
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
    sourceValues: readonly FacetValue[]
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
        values.map((value) => value.handle)
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

  private async applyEmptyDisplayAction(
    displayValueIds: readonly string[],
    action: FacetValueEmptyDisplayAction
  ): Promise<FacetValue[]> {
    if (displayValueIds.length === 0) {
      return [];
    }

    const [displayValues, remainingChildren] = await Promise.all([
      this.repository.facetValue.getByIds(displayValueIds),
      this.repository.facetValue.getSourceChildrenByParentIds(displayValueIds),
    ]);

    const childrenByDisplayId = new Map<string, FacetValue[]>();
    for (const child of remainingChildren) {
      if (!child.parentId) continue;
      const children = childrenByDisplayId.get(child.parentId) ?? [];
      children.push(child);
      childrenByDisplayId.set(child.parentId, children);
    }

    const affectedDisplayValues: FacetValue[] = [];
    for (const displayValue of displayValues) {
      const remaining = childrenByDisplayId.get(displayValue.id) ?? [];
      if (remaining.length > 0) {
        affectedDisplayValues.push(displayValue);
        continue;
      }

      if (action === "delete") {
        await this.repository.facetValue.delete(displayValue.id);
        continue;
      }

      if (action === "disable") {
        const updated = await this.repository.facetValue.updateValue(displayValue.id, {
          enabled: false,
        });
        if (updated) {
          affectedDisplayValues.push(updated);
        }
        continue;
      }

      affectedDisplayValues.push(displayValue);
    }

    return affectedDisplayValues;
  }
}
