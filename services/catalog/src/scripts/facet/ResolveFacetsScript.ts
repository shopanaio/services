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
      const facetType = item.facetType.toUpperCase();
      if (facetType === "TAG") {
        item.resolvedSourceHandles.forEach((value) => tagHandles.add(value));
      } else if (facetType === "FEATURE") {
        item.resolvedSourceHandles.forEach((value) => featureSlugs.add(value));
      } else if (facetType === "OPTION") {
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
