import { randomUUID } from "crypto";
import {
  BaseScript,
  Transactional,
  type UserError,
} from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { FacetValue } from "../../repositories/models/index.js";
import type { FacetValueCreateParams, FacetValueResult } from "./dto/index.js";
import {
  isFacetWithValues,
  isValidDisplayHandle,
  isValidSourceHandle,
  normalizeFacetValueHandle,
} from "./facetValueValidation.js";

export class FacetValueCreateScript extends BaseScript<
  FacetValueCreateParams,
  FacetValueResult
> {
  @Transactional()
  protected async execute(
    params: FacetValueCreateParams
  ): Promise<FacetValueResult> {
    const facet = await this.repository.facet.findById(params.facetId);
    if (!facet) {
      return {
        facetValue: undefined,
        userErrors: [{ message: "Facet not found", field: ["facetId"], code: "NOT_FOUND" }],
      };
    }

    if (!isFacetWithValues(facet.facetType)) {
      return {
        facetValue: undefined,
        userErrors: [
          {
            message: "Facet values are not allowed for PRICE or IN_STOCK",
            field: ["facetId"],
            code: "INVALID",
          },
        ],
      };
    }

    const handle = normalizeFacetValueHandle(params.handle);
    if (!params.label || params.label.trim() === "") {
      return {
        facetValue: undefined,
        userErrors: [{ message: "Label is required", field: ["input", "label"], code: "REQUIRED" }],
      };
    }

    const sourceValueIds = [...new Set(params.sourceValueIds ?? [])];

    if (params.kind === "source") {
      if (sourceValueIds.length > 0) {
        return {
          facetValue: undefined,
          userErrors: [
            {
              message: "sourceValueIds are not allowed when creating a source value",
              field: ["sourceValueIds"],
              code: "INVALID",
            },
          ],
        };
      }

      if (!isValidSourceHandle(facet.facetType, handle)) {
        return {
          facetValue: undefined,
          userErrors: [
            { message: "Invalid source value handle", field: ["handle"], code: "INVALID_HANDLE" },
          ],
        };
      }

      const existing = (await this.repository.facetValue.findAllByFacetId(facet.id))
        .find((value) => value.kind === "source" && value.handle === handle);
      if (existing) {
        return {
          facetValue: undefined,
          userErrors: [
            { message: "Source value handle already exists", field: ["handle"], code: "HANDLE_ALREADY_EXISTS" },
          ],
        };
      }

      try {
        const facetValue = await this.repository.facetValue.createValue({
          facetId: facet.id,
          kind: "source",
          handle,
          label: params.label,
          swatchId: params.swatchId,
          sortIndex: params.sortIndex,
          enabled: params.enabled,
        });

        return { facetValue, userErrors: [] };
      } catch (error) {
        if (isUniqueViolation(error)) {
          return {
            facetValue: undefined,
            userErrors: [
              { message: "Facet value handle already exists", field: ["handle"], code: "HANDLE_ALREADY_EXISTS" },
            ],
          };
        }
        throw error;
      }
    }

    if (params.kind !== "display") {
      return {
        facetValue: undefined,
        userErrors: [
          { message: "Invalid facet value kind", field: ["kind"], code: "INVALID" },
        ],
      };
    }

    if (!isValidDisplayHandle(handle)) {
      return {
        facetValue: undefined,
        userErrors: [
          { message: "Invalid display value handle", field: ["handle"], code: "INVALID_HANDLE" },
        ],
      };
    }

    if ((params.enabled ?? true) && sourceValueIds.length === 0) {
      return {
        facetValue: undefined,
        userErrors: [
          {
            message: "sourceValueIds are required for enabled display values",
            field: ["sourceValueIds"],
            code: "SOURCE_VALUES_REQUIRED",
          },
        ],
      };
    }

    const sourceValues = await this.repository.facetValue.getByIds(sourceValueIds);
    const sourceErrors = this.validateSourceValues(facet.id, sourceValueIds, sourceValues);
    if (sourceErrors.length > 0) {
      return { facetValue: undefined, userErrors: sourceErrors };
    }

    const rootConflict = await this.repository.facetValue.findRootByFacetIdAndHandle(
      facet.id,
      handle
    );
    const conflictsWithAttachedRootSource =
      rootConflict?.kind === "source" && sourceValueIds.includes(rootConflict.id);

    if (rootConflict && !conflictsWithAttachedRootSource) {
      return {
        facetValue: undefined,
        userErrors: [
          { message: "Facet value handle already exists", field: ["handle"], code: "HANDLE_ALREADY_EXISTS" },
        ],
      };
    }

    const initialHandle = conflictsWithAttachedRootSource
      ? `tmp-${randomUUID()}`
      : handle;

    try {
      const created = await this.repository.facetValue.createValue({
        facetId: facet.id,
        kind: "display",
        handle: initialHandle,
        label: params.label,
        swatchId: params.swatchId,
        sortIndex: params.sortIndex,
        enabled: params.enabled,
      });

      if (sourceValueIds.length > 0) {
        await this.repository.facetValue.attachSourcesToDisplay(
          created.id,
          sourceValueIds
        );
      }

      const facetValue =
        initialHandle === handle
          ? created
          : await this.repository.facetValue.updateValue(created.id, { handle });

      return { facetValue: facetValue ?? created, userErrors: [] };
    } catch (error) {
      if (
        isUniqueViolation(error, "facet_value_root_project_facet_handle_uniq") ||
        isUniqueViolation(error, "facet_value_source_project_facet_handle_uniq")
      ) {
        return {
          facetValue: undefined,
          userErrors: [
            { message: "Facet value handle already exists", field: ["handle"], code: "HANDLE_ALREADY_EXISTS" },
          ],
        };
      }
      throw error;
    }
  }

  protected handleError(_error: unknown): FacetValueResult {
    return {
      facetValue: undefined,
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
}
