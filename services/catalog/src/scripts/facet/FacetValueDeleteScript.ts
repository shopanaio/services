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
