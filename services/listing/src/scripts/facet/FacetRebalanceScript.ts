import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  FacetRebalanceParams,
  FacetRebalanceResult,
} from "./dto/index.js";

export class FacetRebalanceScript extends BaseScript<
  FacetRebalanceParams,
  FacetRebalanceResult
> {
  protected async execute(
    _params: FacetRebalanceParams,
  ): Promise<FacetRebalanceResult> {
    await this.repository.facet.rebalanceFacetRanks();
    const facets = await this.repository.facet.findAll();
    return { facets, userErrors: [] };
  }

  protected handleError(_error: unknown): FacetRebalanceResult {
    return {
      facets: [],
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
