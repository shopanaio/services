import type {
  SearchProductBoostConnectionInput,
  SearchProductBoostConnectionResult,
} from "../../repositories/search/SearchProductBoostRepository.js";
import { ListingType } from "./ListingType.js";
import { mapSearchProductBoostListView } from "./searchConfigurationMapper.js";

export { type SearchProductBoostConnectionInput };

export class SearchProductBoostConnectionResolver extends ListingType<
  SearchProductBoostConnectionInput,
  SearchProductBoostConnectionResult
> {
  async $preload(): Promise<SearchProductBoostConnectionResult> {
    return this.$ctx.kernel.repository.searchProductBoost.getConnection(
      this.$props,
    );
  }

  async edges() {
    const edges = (await this.$get("edges")) ?? [];
    return edges.map((edge) => ({
      cursor: edge.cursor,
      node: mapSearchProductBoostListView(edge.node),
    }));
  }

  async pageInfo() {
    return this.$get("pageInfo");
  }

  async totalCount(): Promise<number> {
    return (await this.$get("totalCount")) ?? 0;
  }
}
