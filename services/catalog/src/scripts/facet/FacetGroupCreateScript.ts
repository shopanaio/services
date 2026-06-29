import { BaseScript } from "../../kernel/BaseScript.js";
import type { FacetGroupCreateParams, FacetGroupResult } from "./dto/index.js";

export class FacetGroupCreateScript extends BaseScript<
  FacetGroupCreateParams,
  FacetGroupResult
> {
  protected async execute(params: FacetGroupCreateParams): Promise<FacetGroupResult> {
    if (!params.name || params.name.trim() === "") {
      return {
        facetGroup: undefined,
        userErrors: [
          { message: "Name is required", field: ["input", "name"], code: "REQUIRED" },
        ],
      };
    }

    const facetGroup = await this.repository.facetGroup.create({
      name: params.name.trim(),
      sortIndex: params.sortIndex ?? undefined,
    });

    return { facetGroup, userErrors: [] };
  }

  protected handleError(_error: unknown): FacetGroupResult {
    return {
      facetGroup: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
