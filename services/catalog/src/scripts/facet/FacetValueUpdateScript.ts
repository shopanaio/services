import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { FacetValueResult, FacetValueUpdateParams } from "./dto/index.js";
import {
  isFacetWithValues,
  isValidDisplayHandle,
  normalizeFacetValueHandle,
} from "./facetValueValidation.js";

export class FacetValueUpdateScript extends BaseScript<
  FacetValueUpdateParams,
  FacetValueResult
> {
  @Transactional()
  protected async execute(
    params: FacetValueUpdateParams
  ): Promise<FacetValueResult> {
    const existing = await this.repository.facetValue.findById(params.id);
    if (!existing) {
      return {
        facetValue: undefined,
        userErrors: [{ message: "Facet value not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    const facet = await this.repository.facet.findById(existing.facetId);
    if (!facet) {
      return {
        facetValue: undefined,
        userErrors: [{ message: "Facet not found", code: "NOT_FOUND" }],
      };
    }

    if (!isFacetWithValues(facet.facetType)) {
      return {
        facetValue: undefined,
        userErrors: [
          {
            message: "Facet values are not allowed for PRICE or IN_STOCK",
            code: "INVALID",
          },
        ],
      };
    }

    if (params.label !== undefined && params.label.trim() === "") {
      return {
        facetValue: undefined,
        userErrors: [{ message: "Label cannot be empty", field: ["label"], code: "REQUIRED" }],
      };
    }

    const handle = params.handle === undefined
      ? undefined
      : normalizeFacetValueHandle(params.handle);

    if (handle !== undefined) {
      if (existing.kind === "source") {
        return {
          facetValue: undefined,
          userErrors: [
            {
              message: "Source value handle cannot be changed by generic update",
              field: ["handle"],
              code: "SOURCE_HANDLE_IMMUTABLE",
            },
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

      const duplicate = await this.repository.facetValue.findRootByFacetIdAndHandle(
        existing.facetId,
        handle
      );
      if (duplicate && duplicate.id !== existing.id) {
        return {
          facetValue: undefined,
          userErrors: [
            { message: "Facet value handle already exists", field: ["handle"], code: "HANDLE_ALREADY_EXISTS" },
          ],
        };
      }
    }

    if (existing.kind === "display" && params.enabled === true) {
      const children = await this.repository.facetValue.getSourceChildrenByParentIds([
        existing.id,
      ]);
      if (!children.some((child) => child.enabled)) {
        return {
          facetValue: undefined,
          userErrors: [
            {
              message: "Enabled display values require at least one enabled source value",
              field: ["enabled"],
              code: "SOURCE_VALUES_REQUIRED",
            },
          ],
        };
      }
    }

    try {
      const facetValue = await this.repository.facetValue.updateValue(params.id, {
        handle,
        label: params.label,
        swatchId: params.swatchId,
        sortIndex: params.sortIndex,
        enabled: params.enabled,
      });

      return { facetValue: facetValue ?? undefined, userErrors: [] };
    } catch (error) {
      if (isUniqueViolation(error, "facet_value_root_project_facet_handle_uniq")) {
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
}
