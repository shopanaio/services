import { CatalogType } from "./CatalogType.js";
import { FacetSourceCandidateResolver } from "./FacetSourceCandidateResolver.js";
import type {
  FacetSourceCandidateConnectionResult,
  FacetSourceCandidateRelayInput,
} from "../../repositories/facet/FacetRepository.js";

export type FacetSourceCandidateConnectionInput =
  FacetSourceCandidateRelayInput;

export class FacetSourceCandidateConnectionResolver extends CatalogType<
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
    return edgesData.map((edge) => ({
      cursor: edge.cursor,
      node: new FacetSourceCandidateResolver(edge.node, this.$ctx),
    }));
  }

  async pageInfo() {
    return this.$get("pageInfo");
  }

  async totalCount(): Promise<number> {
    return (await this.$get("totalCount")) ?? 0;
  }
}
