import { ListingType } from "./ListingType.js";
import type {
  FacetSourceCandidateConnectionResult,
  FacetSourceCandidateRelayInput,
} from "../../repositories/facet/FacetRepository.js";

export type FacetSourceCandidateConnectionInput =
  FacetSourceCandidateRelayInput;

export class FacetSourceCandidateConnectionResolver extends ListingType<
  FacetSourceCandidateConnectionInput,
  FacetSourceCandidateConnectionResult
> {
  async $preload(): Promise<FacetSourceCandidateConnectionResult> {
    return this.$ctx.kernel.repository.facet.getAvailableFacetSourceCandidates(
      this.$props
    );
  }

  async edges() {
    const edgesData = (await this.$get("edges")) ?? [];
    return Promise.all(
      edgesData.map(async (edge) => ({
        cursor: edge.cursor,
        node: await this.resolvers.facetSourceCandidate(edge.node),
      }))
    );
  }

  async pageInfo() {
    return this.$get("pageInfo");
  }

  async totalCount(): Promise<number> {
    return (await this.$get("totalCount")) ?? 0;
  }
}
