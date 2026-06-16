import { BaseScript } from "../../kernel/BaseScript.js";
import type { FacetSwatchCreateParams, FacetSwatchResult } from "./dto/index.js";

export class FacetSwatchCreateScript extends BaseScript<
  FacetSwatchCreateParams,
  FacetSwatchResult
> {
  protected async execute(
    params: FacetSwatchCreateParams
  ): Promise<FacetSwatchResult> {
    const facetSwatch = await this.repository.facetSwatch.create({
      swatchType: params.swatchType,
      colorOne: params.colorOne,
      colorTwo: params.colorTwo,
      imageId: params.fileId,
      metadata: params.metadata,
    });

    return { facetSwatch, userErrors: [] };
  }

  protected handleError(_error: unknown): FacetSwatchResult {
    return {
      facetSwatch: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
