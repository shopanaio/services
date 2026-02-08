import { BaseScript } from "../../kernel/BaseScript.js";
import type { FacetSwatchResult, FacetSwatchUpdateParams } from "./dto/index.js";

export class FacetSwatchUpdateScript extends BaseScript<
  FacetSwatchUpdateParams,
  FacetSwatchResult
> {
  protected async execute(
    params: FacetSwatchUpdateParams
  ): Promise<FacetSwatchResult> {
    const existing = await this.repository.facetSwatch.findById(params.id);
    if (!existing) {
      return {
        facetSwatch: undefined,
        userErrors: [{ message: "Facet swatch not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    const facetSwatch = await this.repository.facetSwatch.update(params.id, {
      swatchType: params.swatchType,
      colorOne: params.colorOne,
      colorTwo: params.colorTwo,
      imageId: params.fileId,
      metadata: params.metadata,
    });

    return { facetSwatch: facetSwatch ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): FacetSwatchResult {
    return {
      facetSwatch: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
