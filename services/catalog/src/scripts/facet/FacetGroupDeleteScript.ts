import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  FacetGroupDeleteParams,
  FacetGroupDeleteResult,
} from "./dto/index.js";

export class FacetGroupDeleteScript extends BaseScript<
  FacetGroupDeleteParams,
  FacetGroupDeleteResult
> {
  protected async execute(
    params: FacetGroupDeleteParams
  ): Promise<FacetGroupDeleteResult> {
    const deleted = await this.repository.facetGroup.delete(params.id);
    if (!deleted) {
      return {
        deletedFacetGroupId: undefined,
        userErrors: [{ message: "Facet group not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    return { deletedFacetGroupId: params.id, userErrors: [] };
  }

  protected handleError(_error: unknown): FacetGroupDeleteResult {
    return {
      deletedFacetGroupId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
