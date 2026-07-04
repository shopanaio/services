import { randomUUID } from "crypto";
import {
  BaseScript,
  Transactional,
  type UserError,
} from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { FacetValue } from "../../repositories/models/index.js";
import type {
  FacetValueMergeParams,
  FacetValueMergeResult,
} from "./dto/index.js";
import {
  isFacetWithValues,
  isValidDisplayHandle,
  normalizeFacetValueHandle,
} from "./facetValueValidation.js";

export class FacetValueMergeScript extends BaseScript<
  FacetValueMergeParams,
  FacetValueMergeResult
> {
  @Transactional()
  protected async execute(
    params: FacetValueMergeParams
  ): Promise<FacetValueMergeResult> {
    const sourceValueIds = [...new Set(params.sourceValueIds)];
    if (sourceValueIds.length === 0) {
      return {
        facetValue: undefined,
        sourceValues: [],
        userErrors: [
          {
            message: "sourceValueIds are required",
            field: ["sourceValueIds"],
            code: "SOURCE_VALUES_REQUIRED",
          },
        ],
      };
    }

    const hasExistingTarget = params.targetDisplayValueId !== undefined;
    const hasNewTarget =
      params.targetHandle !== undefined || params.targetLabel !== undefined;
    if (hasExistingTarget && hasNewTarget) {
      return {
        facetValue: undefined,
        sourceValues: [],
        userErrors: [
          {
            message: "Specify either targetDisplayValueId or targetHandle/targetLabel",
            field: ["targetDisplayValueId"],
            code: "TARGET_AMBIGUOUS",
          },
        ],
      };
    }

    if (!hasExistingTarget && (!params.targetHandle || !params.targetLabel)) {
      return {
        facetValue: undefined,
        sourceValues: [],
        userErrors: [
          {
            message: "Target display value or target handle and label are required",
            field: ["targetHandle"],
            code: "TARGET_REQUIRED",
          },
        ],
      };
    }

    const facet = await this.repository.facet.findById(params.facetId);
    if (!facet || !isFacetWithValues(facet.facetType)) {
      return {
        facetValue: undefined,
        sourceValues: [],
        userErrors: [
          { message: "Invalid facet ID", field: ["facetId"], code: "INVALID_FACET_ID" },
        ],
      };
    }

    const sourceValues = await this.repository.facetValue.getByIds(sourceValueIds);
    const sourceErrors = this.validateSourceValues(facet.id, sourceValueIds, sourceValues);
    if (sourceErrors.length > 0) {
      return { facetValue: undefined, sourceValues: [], userErrors: sourceErrors };
    }

    try {
      const target = hasExistingTarget
        ? await this.resolveExistingTarget(params.targetDisplayValueId!, facet.id)
        : await this.createTargetDisplayValue(params, facet.id, sourceValues);

      if (target.userErrors.length > 0 || !target.facetValue) {
        return {
          facetValue: undefined,
          sourceValues: [],
          userErrors: target.userErrors,
        };
      }

      const usabilityError = await this.validateEnabledTargetHasSourceValues(
        target.facetValue,
        sourceValues
      );
      if (usabilityError) {
        return {
          facetValue: undefined,
          sourceValues: [],
          userErrors: [usabilityError],
        };
      }

      await this.repository.facetValue.attachSourcesToDisplay(
        target.facetValue.id,
        sourceValueIds
      );

      const facetValue = target.finalHandle
        ? await this.repository.facetValue.updateValue(target.facetValue.id, {
            handle: target.finalHandle,
          })
        : await this.repository.facetValue.findById(target.facetValue.id);
      const updatedSourceValues = await this.repository.facetValue.getByIds(
        sourceValueIds
      );

      return {
        facetValue: facetValue ?? target.facetValue,
        sourceValues: updatedSourceValues,
        userErrors: [],
      };
    } catch (error) {
      if (isUniqueViolation(error, "facet_value_root_project_facet_handle_uniq")) {
        return {
          facetValue: undefined,
          sourceValues: [],
          userErrors: [
            {
              message: "Facet value handle already exists",
              field: ["targetHandle"],
              code: "HANDLE_ALREADY_EXISTS",
            },
          ],
        };
      }
      throw error;
    }
  }

  protected handleError(_error: unknown): FacetValueMergeResult {
    return {
      facetValue: undefined,
      sourceValues: [],
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }

  private validateSourceValues(
    facetId: string,
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

      if (sourceValue.facetId !== facetId) {
        errors.push({
          message: "Source value does not belong to the target facet",
          field: ["sourceValueIds"],
          code: "FACET_MISMATCH",
        });
      }
    }

    return errors;
  }

  private async resolveExistingTarget(
    targetDisplayValueId: string,
    facetId: string
  ): Promise<{
    facetValue?: FacetValue;
    finalHandle?: string;
    userErrors: UserError[];
  }> {
    const target = await this.repository.facetValue.findById(targetDisplayValueId);
    if (!target || target.kind !== "display") {
      return {
        facetValue: undefined,
        userErrors: [
          {
            message: "Target value must have kind DISPLAY",
            field: ["targetDisplayValueId"],
            code: "TARGET_NOT_DISPLAY",
          },
        ],
      };
    }

    if (target.facetId !== facetId) {
      return {
        facetValue: undefined,
        userErrors: [
          {
            message: "Target value does not belong to the target facet",
            field: ["targetDisplayValueId"],
            code: "FACET_MISMATCH",
          },
        ],
      };
    }

    return { facetValue: target, userErrors: [] };
  }

  private async createTargetDisplayValue(
    params: FacetValueMergeParams,
    facetId: string,
    sourceValues: readonly FacetValue[]
  ): Promise<{
    facetValue?: FacetValue;
    finalHandle?: string;
    userErrors: UserError[];
  }> {
    const targetHandle = normalizeFacetValueHandle(params.targetHandle ?? "");
    const targetLabel = params.targetLabel?.trim() ?? "";

    if (!targetHandle || !targetLabel) {
      return {
        facetValue: undefined,
        userErrors: [
          {
            message: "Target handle and label are required",
            field: ["targetHandle"],
            code: "TARGET_REQUIRED",
          },
        ],
      };
    }

    if (!isValidDisplayHandle(targetHandle)) {
      return {
        facetValue: undefined,
        userErrors: [
          {
            message: "Invalid target display handle",
            field: ["targetHandle"],
            code: "INVALID_HANDLE",
          },
        ],
      };
    }

    if (!sourceValues.some((value) => value.enabled)) {
      return {
        facetValue: undefined,
        userErrors: [
          {
            message: "Enabled display values require at least one enabled source value",
            field: ["sourceValueIds"],
            code: "SOURCE_VALUES_REQUIRED",
          },
        ],
      };
    }

    const rootConflict = await this.repository.facetValue.findRootByFacetIdAndHandle(
      facetId,
      targetHandle
    );
    const sourceValueIds = new Set(sourceValues.map((value) => value.id));
    const conflictsWithMergeSource =
      rootConflict?.kind === "source" && sourceValueIds.has(rootConflict.id);

    if (rootConflict && !conflictsWithMergeSource) {
      return {
        facetValue: undefined,
        userErrors: [
          {
            message: "Facet value handle already exists",
            field: ["targetHandle"],
            code: "HANDLE_ALREADY_EXISTS",
          },
        ],
      };
    }

    const initialHandle = conflictsWithMergeSource
      ? `tmp-${randomUUID()}`
      : targetHandle;
    const created = await this.repository.facetValue.createValue({
      facetId,
      kind: "display",
      handle: initialHandle,
      label: targetLabel,
      enabled: true,
    });

    return {
      facetValue: created,
      finalHandle: initialHandle === targetHandle ? undefined : targetHandle,
      userErrors: [],
    };
  }

  private async validateEnabledTargetHasSourceValues(
    target: FacetValue,
    sourceValues: readonly FacetValue[]
  ): Promise<UserError | null> {
    if (!target.enabled) {
      return null;
    }

    if (sourceValues.some((value) => value.enabled)) {
      return null;
    }

    const existingChildren = await this.repository.facetValue.getSourceChildrenByParentIds([
      target.id,
    ]);
    if (existingChildren.some((value) => value.enabled)) {
      return null;
    }

    return {
      message: "Enabled display values require at least one enabled source value",
      field: ["sourceValueIds"],
      code: "SOURCE_VALUES_REQUIRED",
    };
  }
}
