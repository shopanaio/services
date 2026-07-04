import type { Repository } from "../repositories/Repository.js";
import { FacetLoader } from "./FacetLoader.js";
import { FacetValueLoader } from "./FacetValueLoader.js";
import { FacetSwatchLoader } from "./FacetSwatchLoader.js";

export class Loader {
  public readonly facet;
  public readonly facetTranslation;
  public readonly facetSources;
  public readonly facetValueIds;
  public readonly facetValue;
  public readonly facetValueTranslation;
  public readonly facetValueSourceChildren;
  public readonly facetSwatch;

  constructor(public readonly repository: Repository) {
    const facetLoader = new FacetLoader(repository);
    const facetValueLoader = new FacetValueLoader(repository);
    const facetSwatchLoader = new FacetSwatchLoader(repository);

    this.facet = facetLoader.facet;
    this.facetTranslation = facetLoader.facetTranslation;
    this.facetSources = facetLoader.facetSources;
    this.facetValueIds = facetLoader.facetValueIds;
    this.facetValue = facetValueLoader.facetValue;
    this.facetValueTranslation = facetValueLoader.facetValueTranslation;
    this.facetValueSourceChildren = facetValueLoader.facetValueSourceChildren;
    this.facetSwatch = facetSwatchLoader.facetSwatch;
  }
}
