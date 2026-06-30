import { BaseScript } from "../../kernel/BaseScript.js";
import type { ResolveFacetsParams, ResolveFacetsResult } from "./dto/index.js";

export class ResolveFacetsScript extends BaseScript<
  ResolveFacetsParams,
  ResolveFacetsResult
> {
  protected async execute(params: ResolveFacetsParams): Promise<ResolveFacetsResult> {
    const resolved = await this.repository.facet.resolveFacetFilterValues(
      params.facetFilters
    );

    const tagHandles = new Set<string>();
    const featureSlugs = new Set<string>();
    const optionSlugs = new Set<string>();

    for (const item of resolved) {
      if (item.facetType === "tag") {
        item.resolvedSourceHandles.forEach((value) => tagHandles.add(value));
      } else if (item.facetType === "feature") {
        item.resolvedSourceHandles.forEach((value) => featureSlugs.add(value));
      } else if (item.facetType === "option") {
        item.resolvedSourceHandles.forEach((value) => optionSlugs.add(value));
      }
    }

    return {
      tagHandles: [...tagHandles],
      featureSlugs: [...featureSlugs],
      optionSlugs: [...optionSlugs],
      resolved,
    };
  }

  protected handleError(_error: unknown): ResolveFacetsResult {
    return {
      tagHandles: [],
      featureSlugs: [],
      optionSlugs: [],
      resolved: [],
    };
  }
}
