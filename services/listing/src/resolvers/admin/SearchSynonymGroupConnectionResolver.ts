import type {
  SearchSynonymGroupConnectionResult,
  SearchSynonymGroupRelayInput,
} from "../../repositories/search/SearchSynonymRepository.js";
import { ListingType } from "./ListingType.js";
import { mapSearchSynonymGroupListView } from "./searchConfigurationMapper.js";

export type SearchSynonymGroupConnectionInput = SearchSynonymGroupRelayInput;

export class SearchSynonymGroupConnectionResolver extends ListingType<
  SearchSynonymGroupConnectionInput,
  SearchSynonymGroupConnectionResult
> {
  async $preload(): Promise<SearchSynonymGroupConnectionResult> {
    return this.$ctx.kernel.repository.searchSynonym.getConnection(this.$props);
  }

  async edges() {
    const edges = (await this.$get("edges")) ?? [];
    return edges.map((edge) => ({
      cursor: edge.cursor,
      node: mapSearchSynonymGroupListView(edge.node),
    }));
  }

  async pageInfo() {
    return this.$get("pageInfo");
  }

  async totalCount(): Promise<number> {
    return (await this.$get("totalCount")) ?? 0;
  }
}
