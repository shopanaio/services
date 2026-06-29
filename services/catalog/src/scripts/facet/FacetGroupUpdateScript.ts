import { BaseScript } from "../../kernel/BaseScript.js";
import type { FacetGroupUpdateParams, FacetGroupResult } from "./dto/index.js";

export class FacetGroupUpdateScript extends BaseScript<
  FacetGroupUpdateParams,
  FacetGroupResult
> {
  protected async execute(params: FacetGroupUpdateParams): Promise<FacetGroupResult> {
    const existing = await this.repository.facetGroup.findById(params.id);
    if (!existing) {
      return {
        facetGroup: undefined,
        userErrors: [{ message: "Facet group not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    const facetGroup = await this.repository.facetGroup.update(params.id, {
      name: params.name,
      sortIndex: params.sortIndex,
    });

    return { facetGroup: facetGroup ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): FacetGroupResult {
    return {
      facetGroup: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
