import { CatalogType } from "./CatalogType.js";
import { FacetValueCandidateResolver } from "./FacetValueCandidateResolver.js";
import type {
  FacetValueCandidateArgs,
  FacetValueCandidateConnectionResult,
} from "../../repositories/facet/FacetRepository.js";

export type FacetValueCandidateConnectionInput = FacetValueCandidateArgs;

export class FacetValueCandidateConnectionResolver extends CatalogType<
  FacetValueCandidateConnectionInput,
  FacetValueCandidateConnectionResult
> {
  async $preload(): Promise<FacetValueCandidateConnectionResult> {
    return this.$ctx.kernel.repository.facet.getFacetValueCandidates(
      this.$props
    );
  }

  async edges() {
    const edgesData = (await this.$get("edges")) ?? [];
    return edgesData.map((edge) => ({
      cursor: edge.cursor,
      node: new FacetValueCandidateResolver(edge.node, this.$ctx),
    }));
  }

  async pageInfo() {
    return this.$get("pageInfo");
  }

  async totalCount(): Promise<number> {
    return (await this.$get("totalCount")) ?? 0;
  }
}
