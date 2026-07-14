import type { ServiceContext } from "../../context/types.js";
import type { ListingQueryArgs } from "./ListingQueryTypes.js";
import type { FacetSourceCandidateConnectionInput } from "./FacetSourceCandidateConnectionResolver.js";
import type { FacetValueCandidateConnectionInput } from "./FacetValueCandidateConnectionResolver.js";
import type { SearchSynonymGroupConnectionInput } from "./SearchSynonymGroupConnectionResolver.js";
import type { SearchProductBoostConnectionInput } from "./SearchProductBoostConnectionResolver.js";
import type {
  FacetSourceCandidateView,
  FacetValueCandidateView,
} from "../../repositories/facet/FacetRepository.js";

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

  async listingQuery() {
    const { ListingQueryResolver } = await import("./QueryResolver.js");
    return new ListingQueryResolver({}, this.ctx);
  }

  async listingMutation() {
    const { ListingMutationResolver } = await import("./MutationResolver.js");
    return new ListingMutationResolver({}, this.ctx);
  }

  async listingSearchQuery() {
    const { ListingSearchQueryResolver } = await import("./SearchResolvers.js");
    return new ListingSearchQueryResolver({}, this.ctx);
  }

  async listingSearchMutation() {
    const { ListingSearchMutationResolver } = await import("./SearchResolvers.js");
    return new ListingSearchMutationResolver({}, this.ctx);
  }

  async searchSynonymGroupConnection(
    input: SearchSynonymGroupConnectionInput,
  ) {
    const { SearchSynonymGroupConnectionResolver } = await import(
      "./SearchSynonymGroupConnectionResolver.js"
    );
    return new SearchSynonymGroupConnectionResolver(input, this.ctx);
  }

  async searchProductBoostConnection(
    input: SearchProductBoostConnectionInput,
  ) {
    const { SearchProductBoostConnectionResolver } = await import(
      "./SearchProductBoostConnectionResolver.js"
    );
    return new SearchProductBoostConnectionResolver(input, this.ctx);
  }

  async listingConnection(input: ListingQueryArgs) {
    const { ListingConnectionResolver } = await import(
      "./ListingConnectionResolver.js"
    );
    return new ListingConnectionResolver(input, this.ctx);
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

  async facetSourceCandidate(candidate: FacetSourceCandidateView) {
    const { FacetSourceCandidateResolver } = await import(
      "./FacetSourceCandidateResolver.js"
    );
    return new FacetSourceCandidateResolver(candidate, this.ctx);
  }

  async facetValueCandidate(candidate: FacetValueCandidateView) {
    const { FacetValueCandidateResolver } = await import(
      "./FacetValueCandidateResolver.js"
    );
    return new FacetValueCandidateResolver(candidate, this.ctx);
  }

  async facetSourceCandidateConnection(
    input: FacetSourceCandidateConnectionInput
  ) {
    const { FacetSourceCandidateConnectionResolver } = await import(
      "./FacetSourceCandidateConnectionResolver.js"
    );
    return new FacetSourceCandidateConnectionResolver(input, this.ctx);
  }

  async facetValueCandidateConnection(
    input: FacetValueCandidateConnectionInput
  ) {
    const { FacetValueCandidateConnectionResolver } = await import(
      "./FacetValueCandidateConnectionResolver.js"
    );
    return new FacetValueCandidateConnectionResolver(input, this.ctx);
  }
}
