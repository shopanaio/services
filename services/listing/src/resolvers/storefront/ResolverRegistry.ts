import type { ServiceContext } from "../../context/types.js";
import type {
  FilterPriceRangeResolverInput,
  FilterResolverInput,
  FilterValueResolverInput,
} from "./FilterModels.js";
import type { ProductConnectionInput } from "./ListingQueryTypes.js";
import type { ProductRecommendationConnectionInput } from "./ProductRecommendationConnectionResolver.js";

const registries = new WeakMap<ServiceContext, ResolverRegistry>();

export function getResolverRegistry(ctx: ServiceContext): ResolverRegistry {
  const existing = registries.get(ctx);
  if (existing) return existing;

  const registry = new ResolverRegistry(ctx);
  registries.set(ctx, registry);
  return registry;
}

export class ResolverRegistry {
  constructor(private readonly ctx: ServiceContext) {}

  async category(id: string) {
    const { CategoryResolver } = await import("./CategoryResolver.js");
    return new CategoryResolver(id, this.ctx);
  }

  async collection(input: { id: string; listingRevision: number }) {
    const { CollectionResolver } = await import("./CollectionResolver.js");
    return new CollectionResolver(input, this.ctx);
  }

  async productConnection(input: ProductConnectionInput) {
    const { ProductConnectionResolver } = await import("./ProductConnectionResolver.js");
    return new ProductConnectionResolver(input, this.ctx);
  }

  async productRecommendationConnection(input: ProductRecommendationConnectionInput) {
    const { ProductRecommendationConnectionResolver } =
      await import("./ProductRecommendationConnectionResolver.js");
    return new ProductRecommendationConnectionResolver(input, this.ctx);
  }

  async filter(input: FilterResolverInput) {
    const { FilterResolver } = await import("./FilterResolver.js");
    return new FilterResolver(input, this.ctx);
  }

  async filterValue(input: FilterValueResolverInput) {
    const { FilterValueResolver } = await import("./FilterValueResolver.js");
    return new FilterValueResolver(input, this.ctx);
  }

  async filterPriceRange(input: FilterPriceRangeResolverInput) {
    const { FilterPriceRangeResolver } = await import("./FilterPriceRangeResolver.js");
    return new FilterPriceRangeResolver(input, this.ctx);
  }

  async facet(id: string) {
    const { FacetResolver } = await import("./FacetResolver.js");
    return new FacetResolver(id, this.ctx);
  }

  async facetValue(id: string) {
    const { FacetValueResolver } = await import("./FacetValueResolver.js");
    return new FacetValueResolver(id, this.ctx);
  }

  async facetSwatch(id: string) {
    const { FacetSwatchResolver } = await import("./FacetSwatchResolver.js");
    return new FacetSwatchResolver(id, this.ctx);
  }
}
