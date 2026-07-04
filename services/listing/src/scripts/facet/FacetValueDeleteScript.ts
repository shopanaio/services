import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  FacetValueDeleteParams,
  FacetValueDeleteResult,
} from "./dto/index.js";

export class FacetValueDeleteScript extends BaseScript<
  FacetValueDeleteParams,
  FacetValueDeleteResult
> {
  protected async execute(
    params: FacetValueDeleteParams
  ): Promise<FacetValueDeleteResult> {
    const existing = await this.repository.facetValue.findById(params.id);
    if (!existing) {
      return {
        deletedFacetValueId: undefined,
        userErrors: [{ message: "Facet value not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    if (existing.kind === "display") {
      const children = await this.repository.facetValue.getSourceChildrenByParentIds([
        existing.id,
      ]);
      if (children.length > 0) {
        return {
          deletedFacetValueId: undefined,
          userErrors: [
            {
              message: "Display value has source values and must be unmerged before delete",
              field: ["id"],
              code: "DISPLAY_HAS_SOURCE_VALUES",
            },
          ],
        };
      }
    }

    const deleted = await this.repository.facetValue.delete(params.id);
    if (!deleted) {
      return {
        deletedFacetValueId: undefined,
        userErrors: [{ message: "Facet value not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    return { deletedFacetValueId: params.id, userErrors: [] };
  }

  protected handleError(_error: unknown): FacetValueDeleteResult {
    return {
      deletedFacetValueId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
