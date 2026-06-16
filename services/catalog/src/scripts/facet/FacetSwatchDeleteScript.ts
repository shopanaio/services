import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  FacetSwatchDeleteParams,
  FacetSwatchDeleteResult,
} from "./dto/index.js";

export class FacetSwatchDeleteScript extends BaseScript<
  FacetSwatchDeleteParams,
  FacetSwatchDeleteResult
> {
  protected async execute(
    params: FacetSwatchDeleteParams
  ): Promise<FacetSwatchDeleteResult> {
    const deleted = await this.repository.facetSwatch.delete(params.id);
    if (!deleted) {
      return {
        deletedFacetSwatchId: undefined,
        userErrors: [{ message: "Facet swatch not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }
    return { deletedFacetSwatchId: params.id, userErrors: [] };
  }

  protected handleError(_error: unknown): FacetSwatchDeleteResult {
    return {
      deletedFacetSwatchId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
